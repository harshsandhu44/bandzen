import 'server-only';

import { cache } from 'react';
import {
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  isNotNull,
  isNull,
  lt,
  ne,
  sql,
} from 'drizzle-orm';
import {
  FREE_COACH_MESSAGES_PER_WINDOW,
  FREE_ESSAYS_PER_WINDOW,
  allowance,
  isProAt,
  windowStart,
} from '@/lib/entitlements';
import { isAnswerCorrect, readingBand } from '@/lib/grading';
import { union } from 'drizzle-orm/pg-core';
import { db } from './index';
import {
  accessRequests,
  attemptAnswers,
  attempts,
  awards,
  coachMessages,
  essays,
  lessonProgress,
  listeningTracks,
  passages,
  profiles,
  questionAnswers,
  questions,
  reports,
  subscriptions,
  writingPrompts,
  type Annotation,
  type Criterion,
  type Award,
  type Question,
  type Skill,
} from './schema';

export {
  DIFFICULTY_RANGE,
  listLessonProgress,
  listPassages,
  listTracks,
  listWritingPrompts,
  markLessonComplete,
  pickEasiestPassage,
  pickEasiestTrack,
  pickTask2Prompt,
} from '@bandzen/db/queries';

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
 * deliberately unscoped. Pure content/lesson-progress queries have moved to
 * @bandzen/db/queries (re-exported above) since apps/admin needs them too.
 */

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

/**
 * `cache()` because the shell reads the profile for the sidebar and the page
 * beneath it reads the same row again — React collapses them into one round
 * trip per request rather than two.
 */
export const getProfile = cache(async function getProfile(userId: string) {
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId));
  return row ?? null;
});

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
// Billing and quotas
// ---------------------------------------------------------------------------

export async function getSubscription(userId: string) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));
  return row ?? null;
}

/**
 * How long this candidate has Pro for, or null if never.
 *
 * `cache()` because the shell and the page beneath it both need it on every
 * gated route, and React dedupes them into one round trip per request. It is
 * the same reason `getProfile` is wrapped below.
 *
 * The comparison against now lives in `entitlements.ts` rather than in the
 * SQL, so the expiry boundary is testable without a database.
 */
export const proUntil = cache(async function proUntil(userId: string) {
  const [row] = await db
    .select({ currentPeriodEnd: subscriptions.currentPeriodEnd })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return row?.currentPeriodEnd ?? null;
});

export async function isPro(userId: string): Promise<boolean> {
  return isProAt(await proUntil(userId));
}

/**
 * When each essay in the window was started — timestamps, not a count, because
 * the reset date cannot be derived from a count.
 *
 * Started, not submitted: the mark is charged when the attempt is created, so
 * counting completions would let someone open unlimited attempts before any of
 * them finished, each still costing a grading call.
 *
 * A diagnostic's writing half is excluded because the first diagnostic is free
 * and off-quota, and a failed grading is excluded because that failure is ours.
 */
async function essayStartsInWindow(userId: string, since: Date) {
  const rows = await db
    .select({ startedAt: attempts.startedAt })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, userId),
        eq(attempts.module, 'writing'),
        ne(attempts.kind, 'diagnostic'),
        ne(attempts.status, 'failed'),
        gt(attempts.startedAt, since),
      ),
    );
  return rows.map((r) => r.startedAt);
}

async function coachMessagesInWindow(userId: string, since: Date) {
  const rows = await db
    .select({ createdAt: coachMessages.createdAt })
    .from(coachMessages)
    .where(
      and(eq(coachMessages.userId, userId), gt(coachMessages.createdAt, since)),
    );
  return rows.map((r) => r.createdAt);
}

/**
 * What is left of this candidate's weekly essay marks.
 *
 * One function for the page and the action both, so the meter a candidate is
 * shown and the rule that blocks them can never disagree — the bug that shape
 * of duplication always eventually produces.
 */
export async function essayAllowance(userId: string) {
  const [until, starts] = await Promise.all([
    proUntil(userId),
    essayStartsInWindow(userId, windowStart()),
  ]);
  return allowance({
    isPro: isProAt(until),
    used: starts,
    limit: FREE_ESSAYS_PER_WINDOW,
  });
}

export async function coachAllowance(userId: string) {
  const [until, sent] = await Promise.all([
    proUntil(userId),
    coachMessagesInWindow(userId, windowStart()),
  ]);
  return allowance({
    isPro: isProAt(until),
    used: sent,
    limit: FREE_COACH_MESSAGES_PER_WINDOW,
  });
}

export async function recordCoachMessage(userId: string) {
  await db.insert(coachMessages).values({ userId });
}

/** Marked essays this candidate has ever had back. Drives the first-report moment. */
export async function markedEssayCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, userId),
        eq(attempts.module, 'writing'),
        eq(attempts.status, 'complete'),
      ),
    );
  return row?.n ?? 0;
}

/**
 * Diagnostic sittings that actually produced a result.
 *
 * The reading half is the sitting; writing is its child. Only completed ones
 * count, deliberately: the free diagnostic is the demonstration the whole
 * funnel points at, and a sitting that broke — a grading failure, an abandoned
 * half — must not be the thing that locks someone out of it forever.
 */
export async function diagnosticCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, userId),
        eq(attempts.kind, 'diagnostic'),
        eq(attempts.module, 'reading'),
        eq(attempts.status, 'complete'),
      ),
    );
  return row?.n ?? 0;
}

/**
 * Write what Razorpay told us, from either the checkout return or the webhook.
 *
 * Two guards, because Razorpay delivers at-least-once and does not promise
 * order. Keyed on the user, so a replay is a no-op by construction; and gated
 * on `last_event_at`, so an event delayed behind a newer one is dropped rather
 * than applied. Without that second guard a stale `subscription.charged`
 * replayed after a cancellation would hand Pro back to a refunded account.
 *
 * `greatest` on the date is belt to that brace, and it also covers the grant
 * case: a candidate who buys mid-trial keeps whichever date is further out
 * rather than losing days they already had.
 *
 * `source` is kept from the first write — it records which prompt earned the
 * subscription, and a renewal did not earn it again.
 */
export async function activateSubscription(values: {
  userId: string;
  razorpaySubscriptionId: string | null;
  planId: string;
  status: string;
  currentPeriodEnd: Date;
  source?: string | null;
  lastEventAt?: Date | null;
}) {
  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        razorpaySubscriptionId: sql`excluded.razorpay_subscription_id`,
        planId: sql`excluded.plan_id`,
        status: sql`excluded.status`,
        currentPeriodEnd: sql`greatest(${subscriptions.currentPeriodEnd}, excluded.current_period_end)`,
        source: sql`coalesce(${subscriptions.source}, excluded.source)`,
        lastEventAt: sql`excluded.last_event_at`,
        updatedAt: new Date(),
      },
      setWhere: sql`excluded.last_event_at is null
        or ${subscriptions.lastEventAt} is null
        or excluded.last_event_at >= ${subscriptions.lastEventAt}`,
    });
}

/**
 * Comp someone — the founding cohort, or a new candidate's trial.
 *
 * `onConflictDoNothing`, deliberately not the upsert above, and that is the
 * whole point. A server action is directly invocable, so hanging the trial off
 * "onboarding completed" would otherwise let someone re-run it for a fresh
 * week whenever they liked. One row per user means one trial per user,
 * enforced by the primary key rather than by a check that can race.
 */
export async function grantPro(
  userId: string,
  planId: 'trial' | 'founding',
  endsAt: Date,
) {
  await db
    .insert(subscriptions)
    .values({
      userId,
      razorpaySubscriptionId: null,
      planId,
      status: 'granted',
      currentPeriodEnd: endsAt,
      source: planId,
    })
    .onConflictDoNothing();
}

/**
 * Record a cancellation.
 *
 * Deliberately not the upsert above: `greatest` exists to stop a stale webhook
 * moving the date backwards, and a cancellation that lands early — or a refund
 * — has to be able to do exactly that.
 */
export async function setSubscriptionEnd(
  userId: string,
  status: string,
  currentPeriodEnd: Date,
) {
  await db
    .update(subscriptions)
    .set({ status, currentPeriodEnd, updatedAt: new Date() })
    .where(eq(subscriptions.userId, userId));
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
  where: { passageId?: string; promptId?: string; trackId?: string },
) {
  const clauses = [
    eq(attempts.userId, userId),
    eq(attempts.status, 'in_progress'),
  ];
  if (where.passageId) clauses.push(eq(attempts.passageId, where.passageId));
  if (where.promptId) clauses.push(eq(attempts.promptId, where.promptId));
  if (where.trackId) clauses.push(eq(attempts.trackId, where.trackId));

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
  module: 'reading' | 'writing' | 'listening';
  kind?: 'practice' | 'diagnostic' | 'mock';
  passageId?: string;
  promptId?: string;
  trackId?: string;
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
// Listening
// ---------------------------------------------------------------------------

/**
 * Everything the in-progress test screen needs — deliberately NOT the track's
 * transcript, which is the answer key. Only the offline content scripts and
 * `getListeningReview` (below, post-submission) ever read that column.
 */
export async function getListeningTest(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.trackId) return null;

  const [track] = await db
    .select({
      title: listeningTracks.title,
      audioUrl: listeningTracks.audioUrl,
      matchingOptions: listeningTracks.matchingOptions,
    })
    .from(listeningTracks)
    .where(eq(listeningTracks.id, attempt.trackId));
  if (!track) return null;

  const qs = await db
    .select({
      id: questions.id,
      idx: questions.idx,
      kind: questions.kind,
      prompt: questions.prompt,
      options: questions.options,
    })
    .from(questions)
    .where(eq(questions.trackId, attempt.trackId))
    .orderBy(questions.idx);

  const saved = await db
    .select({
      questionId: attemptAnswers.questionId,
      value: attemptAnswers.value,
      flagged: attemptAnswers.flagged,
    })
    .from(attemptAnswers)
    .where(eq(attemptAnswers.attemptId, attemptId));

  return { attempt, track, questions: qs, saved };
}

/**
 * Grade and close out a listening attempt. Same shape as `submitReading` —
 * exact-match scoring against `questionAnswers`, idempotent on `status`.
 */
export async function submitListening(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.trackId) return null;
  if (attempt.status === 'complete') return attempt;
  if (attempt.module !== 'listening')
    throw new Error('Not a listening attempt');

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
    .where(eq(questions.trackId, attempt.trackId));

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

export async function getListeningReview(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.trackId || attempt.status !== 'complete') return null;

  const [track] = await db
    .select({
      title: listeningTracks.title,
      transcript: listeningTracks.transcript,
    })
    .from(listeningTracks)
    .where(eq(listeningTracks.id, attempt.trackId));
  if (!track) return null;

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
    .where(eq(questions.trackId, attempt.trackId))
    .orderBy(questions.idx);

  return { attempt, track, rows };
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
      .select({ id: attempts.id, status: attempts.status })
      .from(attempts)
      .where(and(eq(attempts.parentId, parentId), eq(attempts.userId, userId)))
      .limit(1),
  );
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

  // Returns the owner because this is where a writing attempt becomes a study
  // day -- `submitEssay` leaves it on 'grading' -- and the caller has no userId
  // of its own to check awards with.
  const [row] = await db
    .update(attempts)
    .set({ status: 'complete', band: values.band, submittedAt: new Date() })
    .where(eq(attempts.id, attemptId))
    .returning({ userId: attempts.userId });
  return row?.userId ?? null;
}

/**
 * Take a failed attempt back for another grading run.
 *
 * The mirror of `claimForGrading`, and atomic for the same reason: the guard
 * on `status = 'failed'` means exactly one caller ever moves the row, so a
 * double press cannot start two graders on one essay.
 *
 * Retrying costs nothing. The mark was charged when the attempt was created,
 * and `essayStartsInWindow` skips `failed` rows — so a run that fails is free
 * until it succeeds, at which point it counts, which is the honest accounting
 * in both directions.
 */
export async function claimFailedForGrading(userId: string, attemptId: string) {
  const [row] = await db
    .update(attempts)
    .set({ status: 'grading' })
    .where(and(ownAttempt(userId, attemptId), eq(attempts.status, 'failed')))
    .returning({ id: attempts.id });
  return Boolean(row);
}

export async function markGradingFailed(attemptId: string) {
  await db
    .update(attempts)
    .set({ status: 'failed' })
    .where(eq(attempts.id, attemptId));
}

export { isAnswerCorrect, readingBand };

// ---------------------------------------------------------------------------
// Awards
//
// The rule lives in `@/lib/awards`, which is pure and knows nothing about a
// database. These four functions are the whole data surface behind it.
// ---------------------------------------------------------------------------

/**
 * Every calendar day the candidate did something, in their own zone.
 *
 * The zone conversion happens here rather than in JavaScript because the two
 * sources have to agree on where a day begins, and doing it twice in two places
 * is how they stop agreeing. A null zone falls back to UTC, which is the same
 * fallback `todayIso` makes.
 */
export async function studyDays(
  userId: string,
  timezone: string | null,
): Promise<string[]> {
  const zone = timezone ?? 'UTC';
  // `union` de-duplicates, which is what makes this distinct days rather than
  // distinct events -- an attempt and a lesson on the same afternoon are one
  // study day, not two.
  const rows = await union(
    db
      .select({
        day: sql<string>`to_char(${attempts.submittedAt} at time zone ${zone}, 'YYYY-MM-DD')`,
      })
      .from(attempts)
      .where(
        and(
          eq(attempts.userId, userId),
          eq(attempts.status, 'complete'),
          isNotNull(attempts.submittedAt),
        ),
      ),
    db
      .select({
        day: sql<string>`to_char(${lessonProgress.completedAt} at time zone ${zone}, 'YYYY-MM-DD')`,
      })
      .from(lessonProgress)
      .where(eq(lessonProgress.userId, userId)),
  );
  return rows.map((r) => r.day);
}

/** The counts behind the "firsts". Lessons and diagnostics, nothing else. */
export async function awardCounts(userId: string) {
  const [lessons, diagnostics] = await Promise.all([
    db
      .select({ n: count() })
      .from(lessonProgress)
      .where(eq(lessonProgress.userId, userId)),
    diagnosticCount(userId),
  ]);
  return {
    lessonsCompleted: lessons[0]?.n ?? 0,
    diagnosticsCompleted: diagnostics,
  };
}

export async function listAwards(userId: string): Promise<Award[]> {
  return db
    .select()
    .from(awards)
    .where(eq(awards.userId, userId))
    .orderBy(desc(awards.earnedAt));
}

/**
 * Record what the candidate has earned.
 *
 * `onConflictDoNothing` is doing real work: the caller passes every award the
 * log justifies, not just the new ones, so this is called with awards already
 * held on every single activity. It also means the neon-http driver's lack of
 * transactions costs nothing here — a write that fails is simply retried, in
 * full, by the next thing the candidate does.
 */
export async function recordAwards(userId: string, awardIds: string[]) {
  if (!awardIds.length) return;
  await db
    .insert(awards)
    .values(awardIds.map((awardId) => ({ userId, awardId })))
    .onConflictDoNothing();
}

/** Acknowledge the dashboard strip. Everything unseen becomes seen at once. */
export async function markAwardsNotified(userId: string) {
  await db
    .update(awards)
    .set({ notifiedAt: new Date() })
    .where(and(eq(awards.userId, userId), isNull(awards.notifiedAt)));
}
