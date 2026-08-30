import 'server-only';

import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { isAnswerCorrect, readingBand } from '@/lib/grading';
import { db } from './index';
import {
  accessRequests,
  attemptAnswers,
  attempts,
  essays,
  passages,
  profiles,
  questionAnswers,
  questions,
  reports,
  writingPrompts,
  type Annotation,
  type Criterion,
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

export async function upsertProfile(
  userId: string,
  values: { targetBand?: number | null; testDate?: string | null },
) {
  await db
    .insert(profiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: profiles.userId, set: values });
}

export async function recordAccessRequest(email: string) {
  // A repeat request is not an error, and telling the sender it is a duplicate
  // would confirm the address is already on file.
  await db.insert(accessRequests).values({ email }).onConflictDoNothing();
}

// ---------------------------------------------------------------------------
// Content (shared, unscoped)
// ---------------------------------------------------------------------------

export function listPassages() {
  return db
    .select({
      id: passages.id,
      title: passages.title,
      topic: passages.topic,
      difficulty: passages.difficulty,
    })
    .from(passages)
    .orderBy(passages.difficulty);
}

export function listWritingPrompts() {
  return db
    .select({
      id: writingPrompts.id,
      task: writingPrompts.task,
      promptText: writingPrompts.promptText,
    })
    .from(writingPrompts)
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
