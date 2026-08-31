import 'server-only';

import {
  and,
  count,
  desc,
  eq,
  exists,
  gte,
  isNotNull,
  lt,
  lte,
  sql,
} from 'drizzle-orm';
import { isAnswerCorrect, readingBand } from '@/lib/grading';
import { db } from './index';
import {
  accessRequests,
  attemptAnswers,
  attempts,
  essays,
  lessonProgress,
  passages,
  profiles,
  questionAnswers,
  questions,
  reports,
  writingPrompts,
  type Annotation,
  type Criterion,
  type Question,
  type Skill,
} from './schema';

/**
 * Every database read and write in the application.
 *
 * This is the ONLY module that imports `db`. Tenant isolation is enforced here
 * and nowhere else, so the rule is absolute: any function touching a
 * user-owned row takes `userId` as its first argument and filters on it. There
 * is no Postgres policy behind this to catch a mistake — a missing filter is a
 * data leak, and the reason it is all in one file is so that a reviewer can
 * check the whole surface at once.
 *
 * Content tables (passages, questions, writing_prompts) are shared and
 * deliberately unscoped.
 */

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function getProfile(userId: string) {
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId));
  return row ?? null;
}

type ProfileValues = {
  examType?: 'academic' | 'general' | null;
  targetBand?: number | null;
  testDate?: string | null;
  selfAssessedBand?: number | null;
  studyMinutes?: number | null;
  timezone?: string | null;
  onboardingCompletedAt?: Date | null;
};

export async function upsertProfile(userId: string, values: ProfileValues) {
  await db
    .insert(profiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values });
}

/**
 * Finish onboarding. Separate from `upsertProfile` only because it is the one
 * write that may stamp the completion time, and stamping it from a settings
 * edit would be wrong.
 */
export async function completeOnboarding(
  userId: string,
  values: Omit<ProfileValues, 'onboardingCompletedAt'>,
) {
  await upsertProfile(userId, { ...values, onboardingCompletedAt: new Date() });
}

export async function recordAccessRequest(email: string) {
  // A repeat request is not an error, and telling the sender it is a duplicate
  // would confirm the address is already on file.
  await db.insert(accessRequests).values({ email }).onConflictDoNothing();
}

// ---------------------------------------------------------------------------
// Content (shared, unscoped)
// ---------------------------------------------------------------------------

/** Difficulty bands, as the practice filters present them. */
export const DIFFICULTY_RANGE = {
  easy: [1, 2],
  medium: [3, 3],
  hard: [4, 5],
} as const;

export function listPassages(filters?: {
  kind?: Question['kind'];
  difficulty?: keyof typeof DIFFICULTY_RANGE;
  id?: string;
}) {
  const clauses = [];

  if (filters?.id) clauses.push(eq(passages.id, filters.id));

  if (filters?.difficulty) {
    const [min, max] = DIFFICULTY_RANGE[filters.difficulty];
    clauses.push(gte(passages.difficulty, min), lte(passages.difficulty, max));
  }

  if (filters?.kind) {
    // A passage qualifies if it carries at least one question of that kind.
    // EXISTS rather than a join, so a passage with four matching questions
    // still comes back once.
    clauses.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(questions)
          .where(
            and(
              eq(questions.passageId, passages.id),
              eq(questions.kind, filters.kind),
            ),
          ),
      ),
    );
  }

  return db
    .select({
      id: passages.id,
      title: passages.title,
      topic: passages.topic,
      difficulty: passages.difficulty,
    })
    .from(passages)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(passages.difficulty);
}

export function listWritingPrompts(filters?: { task?: number; id?: string }) {
  const clauses = [];
  if (filters?.task) clauses.push(eq(writingPrompts.task, filters.task));
  if (filters?.id) clauses.push(eq(writingPrompts.id, filters.id));

  return db
    .select({
      id: writingPrompts.id,
      task: writingPrompts.task,
      format: writingPrompts.format,
      promptText: writingPrompts.promptText,
    })
    .from(writingPrompts)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(writingPrompts.task);
}

async function firstRow<T>(rows: T[]) {
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// Attempts — all scoped
// ---------------------------------------------------------------------------

/** The scoping primitive. Nothing else should build an attempt predicate. */
const ownAttempt = (userId: string, attemptId: string) =>
  and(eq(attempts.id, attemptId), eq(attempts.userId, userId));

export async function getAttempt(userId: string, attemptId: string) {
  return firstRow(
    await db.select().from(attempts).where(ownAttempt(userId, attemptId)),
  );
}

export async function listCompletedAttempts(userId: string, limit = 20) {
  return db
    .select({
      id: attempts.id,
      module: attempts.module,
      kind: attempts.kind,
      band: attempts.band,
      submittedAt: attempts.submittedAt,
    })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.status, 'complete')))
    .orderBy(desc(attempts.submittedAt))
    .limit(limit);
}

export async function latestBand(
  userId: string,
  module: 'reading' | 'writing',
) {
  const [row] = await db
    .select({ band: attempts.band })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, userId),
        eq(attempts.module, module),
        eq(attempts.status, 'complete'),
        isNotNull(attempts.band),
      ),
    )
    .orderBy(desc(attempts.submittedAt))
    .limit(1);
  return row?.band ?? null;
}

export async function findInProgress(
  userId: string,
  where: { passageId?: string; promptId?: string },
) {
  const clauses = [
    eq(attempts.userId, userId),
    eq(attempts.status, 'in_progress'),
  ];
  if (where.passageId) clauses.push(eq(attempts.passageId, where.passageId));
  if (where.promptId) clauses.push(eq(attempts.promptId, where.promptId));

  return firstRow(
    await db
      .select({ id: attempts.id })
      .from(attempts)
      .where(and(...clauses))
      .limit(1),
  );
}

export async function createAttempt(values: {
  userId: string;
  module: 'reading' | 'writing';
  kind?: 'practice' | 'diagnostic' | 'mock';
  passageId?: string;
  promptId?: string;
  parentId?: string;
}) {
  const [row] = await db
    .insert(attempts)
    .values(values)
    .returning({ id: attempts.id });
  if (!row) throw new Error('Could not create attempt');
  if (values.module === 'writing') {
    await db.insert(essays).values({ attemptId: row.id }).onConflictDoNothing();
  }
  return row;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export async function getReadingTest(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.passageId) return null;

  const [passage] = await db
    .select({
      title: passages.title,
      body: passages.body,
      headings: passages.headings,
    })
    .from(passages)
    .where(eq(passages.id, attempt.passageId));
  if (!passage) return null;

  // Note the explicit column list: `questions` carries no answer, but its
  // sibling table does, and a select * here is how that changes by accident.
  const qs = await db
    .select({
      id: questions.id,
      idx: questions.idx,
      kind: questions.kind,
      prompt: questions.prompt,
      options: questions.options,
    })
    .from(questions)
    .where(eq(questions.passageId, attempt.passageId))
    .orderBy(questions.idx);

  const saved = await db
    .select({
      questionId: attemptAnswers.questionId,
      value: attemptAnswers.value,
      flagged: attemptAnswers.flagged,
    })
    .from(attemptAnswers)
    .where(eq(attemptAnswers.attemptId, attemptId));

  return { attempt, passage, questions: qs, saved };
}

export async function saveAnswer(
  userId: string,
  attemptId: string,
  questionId: string,
  value: string | null,
  flagged: boolean,
) {
  // Verify ownership before writing: attempt_answers has no user_id of its own,
  // so without this an attempt id from anywhere would be writable.
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt || attempt.status !== 'in_progress') return;

  await db
    .insert(attemptAnswers)
    .values({ attemptId, questionId, value, flagged })
    .onConflictDoUpdate({
      target: [attemptAnswers.attemptId, attemptAnswers.questionId],
      set: { value, flagged, updatedAt: new Date() },
    });
}

/**
 * Grade and close out a reading attempt.
 *
 * Idempotent without a transaction: the final UPDATE is guarded on
 * `status = 'in_progress'`, so a double submit updates zero rows and returns
 * the already-graded attempt rather than scoring it twice.
 */
export async function submitReading(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.passageId) return null;
  if (attempt.status === 'complete') return attempt;
  if (attempt.module !== 'reading') throw new Error('Not a reading attempt');

  const rows = await db
    .select({
      questionId: questions.id,
      answer: questionAnswers.answer,
      given: attemptAnswers.value,
    })
    .from(questions)
    .innerJoin(questionAnswers, eq(questionAnswers.questionId, questions.id))
    .leftJoin(
      attemptAnswers,
      and(
        eq(attemptAnswers.questionId, questions.id),
        eq(attemptAnswers.attemptId, attemptId),
      ),
    )
    .where(eq(questions.passageId, attempt.passageId));

  const total = rows.length;
  const correct = rows.filter((r) => isAnswerCorrect(r.answer, r.given)).length;

  const [updated] = await db
    .update(attempts)
    .set({
      status: 'complete',
      rawScore: correct,
      total,
      band: readingBand(correct, total),
      submittedAt: new Date(),
    })
    .where(
      and(ownAttempt(userId, attemptId), eq(attempts.status, 'in_progress')),
    )
    .returning();

  return updated ?? (await getAttempt(userId, attemptId));
}

export async function getReadingReview(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.passageId || attempt.status !== 'complete') return null;

  const [passage] = await db
    .select({ title: passages.title })
    .from(passages)
    .where(eq(passages.id, attempt.passageId));
  if (!passage) return null;

  // Answers are only ever joined in for an attempt this user has submitted.
  const rows = await db
    .select({
      id: questions.id,
      idx: questions.idx,
      kind: questions.kind,
      prompt: questions.prompt,
      evidence: questions.evidence,
      explanation: questions.explanation,
      answer: questionAnswers.answer,
      given: attemptAnswers.value,
    })
    .from(questions)
    .innerJoin(questionAnswers, eq(questionAnswers.questionId, questions.id))
    .leftJoin(
      attemptAnswers,
      and(
        eq(attemptAnswers.questionId, questions.id),
        eq(attemptAnswers.attemptId, attemptId),
      ),
    )
    .where(eq(questions.passageId, attempt.passageId))
    .orderBy(questions.idx);

  return { attempt, passage, rows };
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export async function getWritingTest(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.promptId) return null;

  const [prompt] = await db
    .select({
      task: writingPrompts.task,
      promptText: writingPrompts.promptText,
    })
    .from(writingPrompts)
    .where(eq(writingPrompts.id, attempt.promptId));
  if (!prompt) return null;

  const [essay] = await db
    .select({ body: essays.body })
    .from(essays)
    .where(eq(essays.attemptId, attemptId));

  return { attempt, prompt, body: essay?.body ?? '' };
}

export async function saveEssay(
  userId: string,
  attemptId: string,
  body: string,
  wordCount: number,
) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt || attempt.status !== 'in_progress') return;

  await db
    .insert(essays)
    .values({ attemptId, body, wordCount })
    .onConflictDoUpdate({
      target: essays.attemptId,
      set: { body, wordCount, updatedAt: new Date() },
    });
}

/**
 * Claim an essay for grading. Returns true only for the caller that actually
 * moved it from in_progress, so exactly one grader run is ever started.
 */
export async function claimForGrading(userId: string, attemptId: string) {
  const [row] = await db
    .update(attempts)
    .set({ status: 'grading' })
    .where(
      and(ownAttempt(userId, attemptId), eq(attempts.status, 'in_progress')),
    )
    .returning({ id: attempts.id });
  return Boolean(row);
}

export async function getReport(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt) return null;

  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.attemptId, attemptId));
  const [essay] = await db
    .select({ body: essays.body, wordCount: essays.wordCount })
    .from(essays)
    .where(eq(essays.attemptId, attemptId));

  return { attempt, report: report ?? null, essay: essay ?? null };
}

// ---------------------------------------------------------------------------
// Diagnostic
// ---------------------------------------------------------------------------

export async function getDiagnostic(userId: string, readingAttemptId: string) {
  const reading = await getAttempt(userId, readingAttemptId);
  if (!reading) return null;

  const [writing] = await db
    .select()
    .from(attempts)
    .where(
      and(eq(attempts.parentId, readingAttemptId), eq(attempts.userId, userId)),
    );

  const report = writing
    ? ((
        await db
          .select({ weaknesses: reports.weaknesses })
          .from(reports)
          .where(eq(reports.attemptId, writing.id))
      )[0] ?? null)
    : null;

  return {
    reading,
    writing: writing ?? null,
    weaknesses: report?.weaknesses ?? [],
  };
}

export async function latestDiagnostic(userId: string) {
  return firstRow(
    await db
      .select({ id: attempts.id, status: attempts.status })
      .from(attempts)
      .where(
        and(
          eq(attempts.userId, userId),
          eq(attempts.kind, 'diagnostic'),
          eq(attempts.module, 'reading'),
        ),
      )
      .orderBy(desc(attempts.startedAt))
      .limit(1),
  );
}

export async function findChildAttempt(userId: string, parentId: string) {
  return firstRow(
    await db
      .select({ id: attempts.id })
      .from(attempts)
      .where(and(eq(attempts.parentId, parentId), eq(attempts.userId, userId)))
      .limit(1),
  );
}

export async function pickEasiestPassage() {
  return firstRow(
    await db
      .select({ id: passages.id })
      .from(passages)
      .orderBy(passages.difficulty)
      .limit(1),
  );
}

export async function pickTask2Prompt() {
  return firstRow(
    await db
      .select({ id: writingPrompts.id })
      .from(writingPrompts)
      .where(eq(writingPrompts.task, 2))
      .limit(1),
  );
}

// ---------------------------------------------------------------------------
// Learning — lesson bodies are authored TypeScript; only progress is a row
// ---------------------------------------------------------------------------

export async function listLessonProgress(userId: string) {
  return db
    .select({
      lessonId: lessonProgress.lessonId,
      completedAt: lessonProgress.completedAt,
    })
    .from(lessonProgress)
    .where(eq(lessonProgress.userId, userId));
}

export async function markLessonComplete(userId: string, lessonId: string) {
  // Re-finishing a lesson is not an error and must not move the original
  // completion time -- the plan reads "done today" off that timestamp.
  await db
    .insert(lessonProgress)
    .values({ userId, lessonId })
    .onConflictDoNothing();
}

// ---------------------------------------------------------------------------
// Analytics — everything the progress page and the insight are derived from.
// No summary tables: these read the attempts that already exist, so a figure
// can never disagree with the attempt behind it.
// ---------------------------------------------------------------------------

/**
 * Attempts this user submitted on a given calendar day, in their own zone.
 *
 * The comparison is done on a timestamp range rather than by casting the
 * column to a date, so the index on (user_id, submitted_at) is still usable.
 */
export async function attemptsSubmittedOn(
  userId: string,
  dayStart: Date,
  dayEnd: Date,
) {
  return db
    .select({ id: attempts.id, module: attempts.module, kind: attempts.kind })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, userId),
        eq(attempts.status, 'complete'),
        gte(attempts.submittedAt, dayStart),
        lt(attempts.submittedAt, dayEnd),
      ),
    );
}

/**
 * Reading accuracy per question kind. Feeds the skill matrix, the dashboard
 * insight and review's pattern detection -- one query, because they are three
 * views of the same fact and should never disagree.
 */
export async function accuracyByQuestionKind(userId: string) {
  const rows = await db
    .select({
      kind: questions.kind,
      value: attemptAnswers.value,
      answer: questionAnswers.answer,
    })
    .from(attemptAnswers)
    .innerJoin(attempts, eq(attempts.id, attemptAnswers.attemptId))
    .innerJoin(questions, eq(questions.id, attemptAnswers.questionId))
    .innerJoin(questionAnswers, eq(questionAnswers.questionId, questions.id))
    .where(and(eq(attempts.userId, userId), eq(attempts.status, 'complete')));

  const byKind = new Map<string, { correct: number; total: number }>();
  for (const row of rows) {
    const tally = byKind.get(row.kind) ?? { correct: 0, total: 0 };
    tally.total += 1;
    if (isAnswerCorrect(row.answer, row.value)) tally.correct += 1;
    byKind.set(row.kind, tally);
  }

  return [...byKind.entries()].map(([kind, t]) => ({
    kind: kind as Question['kind'],
    correct: t.correct,
    total: t.total,
    accuracy: t.total ? t.correct / t.total : 0,
  }));
}

/** Every completed band for this user, oldest first, for the trend chart. */
export async function bandHistory(userId: string, module?: Skill) {
  return db
    .select({
      module: attempts.module,
      band: attempts.band,
      submittedAt: attempts.submittedAt,
    })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, userId),
        eq(attempts.status, 'complete'),
        isNotNull(attempts.band),
        isNotNull(attempts.submittedAt),
        ...(module ? [eq(attempts.module, module)] : []),
      ),
    )
    .orderBy(attempts.submittedAt);
}

/**
 * Headline activity counts. Study minutes are the real elapsed time between
 * starting and submitting an attempt -- we do not track time on lesson pages,
 * so claiming a "minutes studied" figure that included them would be invented.
 */
export async function activitySummary(userId: string) {
  const [totals] = await db
    .select({
      attemptCount: count(),
      minutes: sql<number>`coalesce(sum(extract(epoch from (${attempts.submittedAt} - ${attempts.startedAt})) / 60), 0)::int`,
      questions: sql<number>`coalesce(sum(${attempts.total}), 0)::int`,
    })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.status, 'complete')));

  const [lessons] = await db
    .select({ value: count() })
    .from(lessonProgress)
    .where(eq(lessonProgress.userId, userId));

  return {
    attempts: totals?.attemptCount ?? 0,
    minutes: totals?.minutes ?? 0,
    questions: totals?.questions ?? 0,
    lessons: lessons?.value ?? 0,
  };
}

/** The newest writing report, for the dashboard insight. */
export async function latestReport(userId: string) {
  return firstRow(
    await db
      .select({
        attemptId: reports.attemptId,
        band: reports.band,
        criteria: reports.criteria,
        strengths: reports.strengths,
        weaknesses: reports.weaknesses,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .innerJoin(attempts, eq(attempts.id, reports.attemptId))
      .where(eq(attempts.userId, userId))
      .orderBy(desc(reports.createdAt))
      .limit(1),
  );
}

// ---------------------------------------------------------------------------
// Grader — the only unscoped writes, called from a background task that has
// already had its attempt id authorised by claimForGrading.
// ---------------------------------------------------------------------------

export async function loadForGrading(attemptId: string) {
  const [row] = await db
    .select({
      body: essays.body,
      wordCount: essays.wordCount,
      task: writingPrompts.task,
      promptText: writingPrompts.promptText,
    })
    .from(attempts)
    .innerJoin(essays, eq(essays.attemptId, attempts.id))
    .innerJoin(writingPrompts, eq(writingPrompts.id, attempts.promptId))
    .where(eq(attempts.id, attemptId));
  return row ?? null;
}

export async function writeReport(
  attemptId: string,
  values: {
    band: number;
    criteria: Criterion[];
    annotations: Annotation[];
    strengths: string[];
    weaknesses: string[];
    model: string;
  },
) {
  await db
    .insert(reports)
    .values({ attemptId, ...values })
    .onConflictDoUpdate({ target: reports.attemptId, set: values });

  await db
    .update(attempts)
    .set({ status: 'complete', band: values.band, submittedAt: new Date() })
    .where(eq(attempts.id, attemptId));
}

export async function markGradingFailed(attemptId: string) {
  await db
    .update(attempts)
    .set({ status: 'failed' })
    .where(eq(attempts.id, attemptId));
}

export { isAnswerCorrect, readingBand };
