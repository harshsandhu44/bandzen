import 'server-only';

import { cache } from 'react';
import {
  and,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  sql,
} from 'drizzle-orm';
import {
  FREE_COACH_MESSAGES_PER_WINDOW,
  FREE_ESSAYS_PER_WINDOW,
  FREE_PRACTICE_TESTS_PER_MODULE,
  allowance,
  canStartMock,
  isProAt,
  lifetimeAllowance,
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
  mockAttempts,
  passages,
  profiles,
  questionAnswers,
  questions,
  reports,
  speakingPrompts,
  speakingResponses,
  speakingTests,
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
  listSpeakingTests,
  listTracks,
  listWritingPrompts,
  markLessonComplete,
  pickEasiestPassage,
  pickEasiestSpeakingTest,
  pickEasiestTrack,
  pickRandomPassages,
  pickRandomPrompt,
  pickRandomSpeakingTest,
  pickRandomTracks,
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

async function mockStartsInWindow(userId: string, since: Date) {
  const rows = await db
    .select({ startedAt: mockAttempts.startedAt })
    .from(mockAttempts)
    .where(
      and(
        eq(mockAttempts.userId, userId),
        // Only real mocks count against the weekly cap — a diagnostic is a
        // `mock_attempts` row too and must not spend the slot.
        eq(mockAttempts.kind, 'mock'),
        gt(mockAttempts.startedAt, since),
      ),
    );
  return rows.map((r) => r.startedAt);
}

/** One function for the `/mock` hub and `startMock` both — see `essayAllowance`. */
export async function mockAllowance(userId: string) {
  const [until, starts] = await Promise.all([
    proUntil(userId),
    mockStartsInWindow(userId, windowStart()),
  ]);
  return canStartMock({ isPro: isProAt(until), startsInWindow: starts });
}

/**
 * How many Reading or Listening practice tests this candidate has started,
 * ever. Lifetime, so no window — the Free cap is a fixed number of tries, not
 * a weekly ration.
 *
 * Started, not submitted, and `failed` excluded, for the same reasons as
 * `essayStartsInWindow`. Diagnostic and mock attempts are a different `kind`
 * and never count.
 */
async function practiceAttemptsUsed(
  userId: string,
  module: 'reading' | 'listening',
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, userId),
        eq(attempts.module, module),
        eq(attempts.kind, 'practice'),
        ne(attempts.status, 'failed'),
      ),
    );
  return row?.n ?? 0;
}

/**
 * What is left of a Free candidate's Reading or Listening practice tests. One
 * function for the list page's meter and the `start*Attempt` gate both, as
 * with `essayAllowance`.
 */
export async function practiceAllowance(
  userId: string,
  module: 'reading' | 'listening',
) {
  const [until, used] = await Promise.all([
    proUntil(userId),
    practiceAttemptsUsed(userId, module),
  ]);
  return lifetimeAllowance({
    isPro: isProAt(until),
    used,
    limit: FREE_PRACTICE_TESTS_PER_MODULE,
  });
}

/**
 * Content this candidate has already seen — practice, diagnostic, or a prior
 * mock — so `startMock`'s random selection can skip it. `pickRandom*` fall
 * back to no exclusion on their own if a set here would empty the pool, so
 * this only ever narrows the choice, never blocks it.
 */
export async function mockContentExclusions(userId: string) {
  const [attemptRows, mockRows] = await Promise.all([
    db
      .select({
        passageId: attempts.passageId,
        trackId: attempts.trackId,
        promptId: attempts.promptId,
        speakingTestId: attempts.speakingTestId,
      })
      .from(attempts)
      .where(eq(attempts.userId, userId)),
    db
      .select({
        readingPassageIds: mockAttempts.readingPassageIds,
        listeningTrackIds: mockAttempts.listeningTrackIds,
        writingTask1PromptId: mockAttempts.writingTask1PromptId,
        writingTask2PromptId: mockAttempts.writingTask2PromptId,
        speakingTestId: mockAttempts.speakingTestId,
      })
      .from(mockAttempts)
      .where(eq(mockAttempts.userId, userId)),
  ]);

  const passageIds = new Set<string>();
  const trackIds = new Set<string>();
  const promptIds = new Set<string>();
  const speakingTestIds = new Set<string>();

  for (const a of attemptRows) {
    if (a.passageId) passageIds.add(a.passageId);
    if (a.trackId) trackIds.add(a.trackId);
    if (a.promptId) promptIds.add(a.promptId);
    if (a.speakingTestId) speakingTestIds.add(a.speakingTestId);
  }
  for (const m of mockRows) {
    for (const id of m.readingPassageIds) passageIds.add(id);
    for (const id of m.listeningTrackIds) trackIds.add(id);
    // task1 / speakingTest are nullable — a diagnostic sits Task 2 only, and a
    // backfilled legacy diagnostic has no speaking test.
    if (m.writingTask1PromptId) promptIds.add(m.writingTask1PromptId);
    promptIds.add(m.writingTask2PromptId);
    if (m.speakingTestId) speakingTestIds.add(m.speakingTestId);
  }

  return {
    passageIds: [...passageIds],
    trackIds: [...trackIds],
    promptIds: [...promptIds],
    speakingTestIds: [...speakingTestIds],
  };
}

export async function createMockAttempt(values: {
  userId: string;
  /** Omit for a full mock; `'diagnostic'` for the trimmed 4-skill sitting. */
  kind?: 'mock' | 'diagnostic';
  readingPassageIds: string[];
  listeningTrackIds: string[];
  /** Null for a diagnostic — Task 2 only. */
  writingTask1PromptId: string | null;
  writingTask2PromptId: string;
  speakingTestId: string;
}) {
  const [row] = await db.insert(mockAttempts).values(values).returning();
  if (!row) throw new Error('Could not create mock attempt');
  return row;
}

export async function getMockAttempt(userId: string, mockAttemptId: string) {
  return firstRow(
    await db
      .select()
      .from(mockAttempts)
      .where(
        and(
          eq(mockAttempts.id, mockAttemptId),
          eq(mockAttempts.userId, userId),
        ),
      ),
  );
}

/** The most recent open sitting of one kind, for its start action to resume instead of starting a second. */
async function latestOpenSitting(userId: string, kind: 'mock' | 'diagnostic') {
  return firstRow(
    await db
      .select()
      .from(mockAttempts)
      .where(
        and(
          eq(mockAttempts.userId, userId),
          eq(mockAttempts.kind, kind),
          isNull(mockAttempts.submittedAt),
        ),
      )
      .orderBy(desc(mockAttempts.startedAt))
      .limit(1),
  );
}

/** The most recent mock still open, for `startMock` to resume instead of starting a second one. */
export async function latestOpenMock(userId: string) {
  return latestOpenSitting(userId, 'mock');
}

/** The most recent diagnostic sitting still open, for `startDiagnostic` to resume. */
export async function latestOpenDiagnostic(userId: string) {
  return latestOpenSitting(userId, 'diagnostic');
}

/** This sitting's child attempt(s) for one module — 0, 1 (every module but Writing) or 2 (Writing). */
export async function getMockSectionAttempts(
  userId: string,
  mockAttemptId: string,
  module: Skill,
) {
  return db
    .select()
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, userId),
        eq(attempts.mockAttemptId, mockAttemptId),
        eq(attempts.module, module),
      ),
    );
}

/** Every section attempt under one sitting, sorted onto the 5 slots the result page needs. */
export async function getMockResult(userId: string, mockAttemptId: string) {
  const mock = await getMockAttempt(userId, mockAttemptId);
  if (!mock) return null;

  const rows = await db
    .select()
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, userId),
        eq(attempts.mockAttemptId, mockAttemptId),
      ),
    );

  return {
    mock,
    kind: mock.kind,
    listening: rows.find((r) => r.module === 'listening') ?? null,
    reading: rows.find((r) => r.module === 'reading') ?? null,
    // A diagnostic sits Task 2 only — `writingTask1PromptId` is null and there
    // is no task1 row. The single writing row matches `writingTask2PromptId`.
    task1:
      (mock.writingTask1PromptId != null
        ? rows.find(
            (r) =>
              r.module === 'writing' &&
              r.promptId === mock.writingTask1PromptId,
          )
        : null) ?? null,
    task2:
      rows.find(
        (r) =>
          r.module === 'writing' && r.promptId === mock.writingTask2PromptId,
      ) ?? null,
    speaking: rows.find((r) => r.module === 'speaking') ?? null,
  };
}

/** Speaking is the last section — this is what closes the sitting and frees the weekly cap. */
export async function submitMockAttempt(userId: string, mockAttemptId: string) {
  await db
    .update(mockAttempts)
    .set({ submittedAt: new Date() })
    .where(
      and(
        eq(mockAttempts.id, mockAttemptId),
        eq(mockAttempts.userId, userId),
        isNull(mockAttempts.submittedAt),
      ),
    );
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
 * Diagnostic sittings that actually finished.
 *
 * A diagnostic is a `mock_attempts` row with `kind = 'diagnostic'`; it counts
 * once `submittedAt` is stamped — which happens when the last section for that
 * candidate submits (Speaking for Pro, Writing for Free). A sitting abandoned
 * part way has a null `submittedAt` and does not count, deliberately: the free
 * diagnostic is the demonstration the whole funnel points at, and a sitting
 * that broke must not be the thing that locks someone out of it forever.
 * Legacy 2-skill diagnostics are backfilled with `submittedAt` set, so they
 * still count here.
 */
export async function diagnosticCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(mockAttempts)
    .where(
      and(
        eq(mockAttempts.userId, userId),
        eq(mockAttempts.kind, 'diagnostic'),
        isNotNull(mockAttempts.submittedAt),
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

/** Every section attempt created so far under one mock sitting — `mockPosition` reads this. */
export async function getMockSiblings(userId: string, mockAttemptId: string) {
  return db
    .select({ module: attempts.module, status: attempts.status })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, userId),
        eq(attempts.mockAttemptId, mockAttemptId),
      ),
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

export async function latestBand(userId: string, module: Skill) {
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
  where: {
    passageId?: string;
    promptId?: string;
    trackId?: string;
    speakingTestId?: string;
  },
) {
  const clauses = [
    eq(attempts.userId, userId),
    eq(attempts.status, 'in_progress'),
  ];
  if (where.passageId) clauses.push(eq(attempts.passageId, where.passageId));
  if (where.promptId) clauses.push(eq(attempts.promptId, where.promptId));
  if (where.trackId) clauses.push(eq(attempts.trackId, where.trackId));
  if (where.speakingTestId)
    clauses.push(eq(attempts.speakingTestId, where.speakingTestId));

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
  module: Skill;
  kind?: 'practice' | 'diagnostic' | 'mock';
  passageId?: string;
  promptId?: string;
  trackId?: string;
  speakingTestId?: string;
  parentId?: string;
  mockAttemptId?: string;
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

/**
 * The mock's Reading section: the 3 passages `startMock` picked, stacked
 * under one attempt row. `questions.idx` is only unique per passage
 * (`questions_passage_idx_key`), so it is renumbered 1..N across all three
 * here — the DB column itself is untouched — which is also what lets
 * `ObjectiveRunner`'s jump-to-question logic work unmodified. Each passage
 * keeps its own heading list for `matching_headings`, so the caller gets a
 * per-question lookup rather than one shared list.
 */
export async function getMockReadingTest(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.mockAttemptId || attempt.module !== 'reading') return null;

  const mock = await getMockAttempt(userId, attempt.mockAttemptId);
  if (!mock) return null;

  const passageRows = await db
    .select({
      id: passages.id,
      title: passages.title,
      body: passages.body,
      headings: passages.headings,
    })
    .from(passages)
    .where(inArray(passages.id, mock.readingPassageIds));
  const byId = new Map(passageRows.map((p) => [p.id, p]));
  const orderedPassages = mock.readingPassageIds
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null);
  if (orderedPassages.length !== mock.readingPassageIds.length) return null;

  const qs = await db
    .select({
      id: questions.id,
      idx: questions.idx,
      kind: questions.kind,
      prompt: questions.prompt,
      options: questions.options,
      passageId: questions.passageId,
    })
    .from(questions)
    .where(inArray(questions.passageId, mock.readingPassageIds));

  let n = 0;
  const headingsByQuestion = new Map<string, string[] | null>();
  const renumbered = orderedPassages.flatMap((p) =>
    qs
      .filter((q) => q.passageId === p.id)
      .sort((a, b) => a.idx - b.idx)
      .map((q) => {
        n += 1;
        headingsByQuestion.set(q.id, p.headings);
        return {
          id: q.id,
          idx: n,
          kind: q.kind,
          prompt: q.prompt,
          options: q.options,
        };
      }),
  );

  const saved = await db
    .select({
      questionId: attemptAnswers.questionId,
      value: attemptAnswers.value,
      flagged: attemptAnswers.flagged,
    })
    .from(attemptAnswers)
    .where(eq(attemptAnswers.attemptId, attemptId));

  return {
    attempt,
    kind: mock.kind,
    passages: orderedPassages,
    questions: renumbered,
    headingsByQuestion,
    saved,
  };
}

/** Grades all 3 passages in one pass and writes one aggregate band, same rule as `submitReading`. */
export async function submitMockReading(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.mockAttemptId || attempt.module !== 'reading') return null;
  if (attempt.status === 'complete') return attempt;

  const mock = await getMockAttempt(userId, attempt.mockAttemptId);
  if (!mock) return null;

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
    .where(inArray(questions.passageId, mock.readingPassageIds));

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

  const [row] = await db
    .select({
      title: listeningTracks.title,
      audioUrl: listeningTracks.audioUrl,
      matchingOptions: listeningTracks.matchingOptions,
      peaks: listeningTracks.peaks,
    })
    .from(listeningTracks)
    .where(eq(listeningTracks.id, attempt.trackId));
  // audio_url is nullable at the column level (the CMS can hold a track that
  // is still being synthesized) but a published track always has one.
  if (!row || row.audioUrl == null) return null;
  const track = { ...row, audioUrl: row.audioUrl };

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

/**
 * The mock's Listening section: the 4 tracks `startMock` picked, played in
 * that order under one attempt row — see `getMockReadingTest` for why
 * `questions.idx` is renumbered across all of them. Tracks missing audio (a
 * CMS generation still in flight) fail the whole section rather than play a
 * silent gap.
 */
export async function getMockListeningTest(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.mockAttemptId || attempt.module !== 'listening') return null;

  const mock = await getMockAttempt(userId, attempt.mockAttemptId);
  if (!mock) return null;

  const trackRows = await db
    .select({
      id: listeningTracks.id,
      title: listeningTracks.title,
      audioUrl: listeningTracks.audioUrl,
      matchingOptions: listeningTracks.matchingOptions,
      peaks: listeningTracks.peaks,
      durationSeconds: listeningTracks.durationSeconds,
    })
    .from(listeningTracks)
    .where(inArray(listeningTracks.id, mock.listeningTrackIds));
  const byId = new Map(trackRows.map((t) => [t.id, t]));
  const orderedTracks = mock.listeningTrackIds
    .map((id) => byId.get(id))
    .filter(
      (
        t,
      ): t is NonNullable<typeof t> & {
        audioUrl: string;
        durationSeconds: number;
      } => t != null && t.audioUrl != null && t.durationSeconds != null,
    );
  if (orderedTracks.length !== mock.listeningTrackIds.length) return null;

  const qs = await db
    .select({
      id: questions.id,
      idx: questions.idx,
      kind: questions.kind,
      prompt: questions.prompt,
      options: questions.options,
      trackId: questions.trackId,
    })
    .from(questions)
    .where(inArray(questions.trackId, mock.listeningTrackIds));

  let n = 0;
  const matchingOptionsByQuestion = new Map<string, string[] | null>();
  const renumbered = orderedTracks.flatMap((t) =>
    qs
      .filter((q) => q.trackId === t.id)
      .sort((a, b) => a.idx - b.idx)
      .map((q) => {
        n += 1;
        matchingOptionsByQuestion.set(q.id, t.matchingOptions);
        return {
          id: q.id,
          idx: n,
          kind: q.kind,
          prompt: q.prompt,
          options: q.options,
        };
      }),
  );

  const saved = await db
    .select({
      questionId: attemptAnswers.questionId,
      value: attemptAnswers.value,
      flagged: attemptAnswers.flagged,
    })
    .from(attemptAnswers)
    .where(eq(attemptAnswers.attemptId, attemptId));

  return {
    attempt,
    kind: mock.kind,
    tracks: orderedTracks,
    questions: renumbered,
    matchingOptionsByQuestion,
    saved,
  };
}

/** Grades all 4 tracks in one pass and writes one aggregate band, same rule as `submitListening`. */
export async function submitMockListening(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.mockAttemptId || attempt.module !== 'listening') return null;
  if (attempt.status === 'complete') return attempt;

  const mock = await getMockAttempt(userId, attempt.mockAttemptId);
  if (!mock) return null;

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
    .where(inArray(questions.trackId, mock.listeningTrackIds));

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

  const [row] = await db
    .select({
      title: listeningTracks.title,
      transcript: listeningTracks.transcript,
    })
    .from(listeningTracks)
    .where(eq(listeningTracks.id, attempt.trackId));
  // transcript is nullable at the column level; a completed attempt's track
  // has always been published, which requires one.
  if (!row || row.transcript == null) return null;
  const track = { ...row, transcript: row.transcript };

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
// Speaking
// ---------------------------------------------------------------------------

/**
 * Everything the test runner needs. No answer key exists for Speaking, so
 * unlike `getListeningTest` there is nothing sensitive to withhold — the
 * prompts and their examiner audio are the whole of it.
 */
export async function getSpeakingTest(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.speakingTestId) return null;

  const [test] = await db
    .select({ title: speakingTests.title })
    .from(speakingTests)
    .where(eq(speakingTests.id, attempt.speakingTestId));
  if (!test) return null;

  const prompts = await db
    .select({
      id: speakingPrompts.id,
      idx: speakingPrompts.idx,
      part: speakingPrompts.part,
      text: speakingPrompts.text,
      cueCardPoints: speakingPrompts.cueCardPoints,
      prepSeconds: speakingPrompts.prepSeconds,
      audioUrl: speakingPrompts.audioUrl,
    })
    .from(speakingPrompts)
    .where(eq(speakingPrompts.testId, attempt.speakingTestId))
    .orderBy(speakingPrompts.idx);

  const saved = await db
    .select({
      promptId: speakingResponses.promptId,
      audioUrl: speakingResponses.audioUrl,
      durationSeconds: speakingResponses.durationSeconds,
    })
    .from(speakingResponses)
    .where(eq(speakingResponses.attemptId, attemptId));

  return { attempt, test, prompts, saved };
}

/**
 * Store one recorded answer. Called as the candidate finishes each prompt, so
 * a refresh mid-test loses nothing. Ownership is checked here because
 * `speaking_responses` has no user id of its own.
 */
export async function saveSpeakingResponse(
  userId: string,
  attemptId: string,
  promptId: string,
  audioUrl: string,
  durationSeconds: number | null,
) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt || attempt.status !== 'in_progress') return;

  await db
    .insert(speakingResponses)
    .values({ attemptId, promptId, audioUrl, durationSeconds })
    .onConflictDoUpdate({
      target: [speakingResponses.attemptId, speakingResponses.promptId],
      set: { audioUrl, durationSeconds, updatedAt: new Date() },
    });
}

/**
 * The prompts and recordings for a claimed attempt. No userId — like
 * `loadForGrading`, the caller only runs after `claimForGrading` authorised
 * the attempt id.
 */
export async function loadSpeakingForGrading(attemptId: string) {
  const [attempt] = await db
    .select({ speakingTestId: attempts.speakingTestId })
    .from(attempts)
    .where(eq(attempts.id, attemptId));
  if (!attempt?.speakingTestId) return null;

  const [test] = await db
    .select({ title: speakingTests.title })
    .from(speakingTests)
    .where(eq(speakingTests.id, attempt.speakingTestId));
  if (!test) return null;

  const rows = await db
    .select({
      promptId: speakingPrompts.id,
      idx: speakingPrompts.idx,
      part: speakingPrompts.part,
      text: speakingPrompts.text,
      audioUrl: speakingResponses.audioUrl,
    })
    .from(speakingPrompts)
    .innerJoin(
      speakingResponses,
      and(
        eq(speakingResponses.promptId, speakingPrompts.id),
        eq(speakingResponses.attemptId, attemptId),
      ),
    )
    .where(eq(speakingPrompts.testId, attempt.speakingTestId))
    .orderBy(speakingPrompts.idx);

  return { title: test.title, answers: rows };
}

/** Persist the Whisper transcript of one answer, for the review page. */
export async function saveResponseTranscript(
  attemptId: string,
  promptId: string,
  transcript: string,
) {
  await db
    .update(speakingResponses)
    .set({ transcript })
    .where(
      and(
        eq(speakingResponses.attemptId, attemptId),
        eq(speakingResponses.promptId, promptId),
      ),
    );
}

/** Attempt + report + every recorded answer with its transcript, for review. */
export async function getSpeakingReport(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt) return null;

  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.attemptId, attemptId));

  const responses = await db
    .select({
      promptId: speakingResponses.promptId,
      idx: speakingPrompts.idx,
      part: speakingPrompts.part,
      promptText: speakingPrompts.text,
      audioUrl: speakingResponses.audioUrl,
      transcript: speakingResponses.transcript,
    })
    .from(speakingResponses)
    .innerJoin(
      speakingPrompts,
      eq(speakingPrompts.id, speakingResponses.promptId),
    )
    .where(eq(speakingResponses.attemptId, attemptId))
    .orderBy(speakingPrompts.idx);

  return { attempt, report: report ?? null, responses };
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
      chartData: writingPrompts.chartData,
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

/**
 * The Writing section of a sitting. A mock has both tasks, keyed by which
 * prompt each attempt row was created for (there is no other way to tell them
 * apart — both rows are `module: 'writing'`, same `mockAttemptId`, same
 * `startedAt`). A diagnostic has Task 2 only: one row, `task1` null.
 *
 * `startedAt` comes off the rows themselves rather than `mockAttempts`,
 * because that's the actual clock anchor the section timer counts down from.
 */
export async function getMockWritingTest(
  userId: string,
  mockAttemptId: string,
) {
  const mock = await getMockAttempt(userId, mockAttemptId);
  if (!mock) return null;

  const promptIds = [
    ...(mock.writingTask1PromptId ? [mock.writingTask1PromptId] : []),
    mock.writingTask2PromptId,
  ];

  const [rows, promptRows] = await Promise.all([
    getMockSectionAttempts(userId, mockAttemptId, 'writing'),
    db
      .select({
        id: writingPrompts.id,
        task: writingPrompts.task,
        promptText: writingPrompts.promptText,
        chartData: writingPrompts.chartData,
      })
      .from(writingPrompts)
      .where(inArray(writingPrompts.id, promptIds)),
  ]);

  const row2 = rows.find((r) => r.promptId === mock.writingTask2PromptId);
  const prompt2 = promptRows.find((p) => p.id === mock.writingTask2PromptId);
  if (!row2 || !prompt2) return null;

  const essayRows = await db
    .select({ attemptId: essays.attemptId, body: essays.body })
    .from(essays)
    .where(inArray(essays.attemptId, rows.map((r) => r.id)));
  const bodyFor = (attemptId: string) =>
    essayRows.find((e) => e.attemptId === attemptId)?.body ?? '';

  // A diagnostic (Task 2 only): one row, no task1.
  if (mock.writingTask1PromptId == null) {
    return {
      startedAt: row2.startedAt,
      kind: mock.kind,
      task1: null,
      task2: { attemptId: row2.id, ...prompt2, body: bodyFor(row2.id) },
    };
  }

  const row1 = rows.find((r) => r.promptId === mock.writingTask1PromptId);
  const prompt1 = promptRows.find((p) => p.id === mock.writingTask1PromptId);
  if (!row1 || !prompt1) return null;

  return {
    startedAt: row1.startedAt,
    kind: mock.kind,
    task1: { attemptId: row1.id, ...prompt1, body: bodyFor(row1.id) },
    task2: { attemptId: row2.id, ...prompt2, body: bodyFor(row2.id) },
  };
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

/**
 * A diagnostic sitting's result: the per-skill section rows (same shape as
 * `getMockResult`) plus the weakness phrases from the essay's report, which
 * the "what to do next" plan on the result page reads.
 *
 * `sittingId` is a `mock_attempts.id`. It also accepts a legacy reading
 * attempt id — every backfilled diagnostic set `mockAttemptId` on its two
 * rows, so an old `/diagnostic/[readingAttemptId]/result` link still resolves.
 */
export async function getDiagnosticResult(userId: string, sittingId: string) {
  let result = await getMockResult(userId, sittingId);

  if (!result) {
    const attempt = await getAttempt(userId, sittingId);
    if (!attempt?.mockAttemptId) return null;
    result = await getMockResult(userId, attempt.mockAttemptId);
    if (!result) return null;
  }
  if (result.kind !== 'diagnostic') return null;

  const essay = result.task2;
  const weaknesses = essay
    ? ((
        await db
          .select({ weaknesses: reports.weaknesses })
          .from(reports)
          .where(eq(reports.attemptId, essay.id))
      )[0]?.weaknesses ?? [])
    : [];

  return { ...result, weaknesses };
}

/** The most recent diagnostic sitting, whatever its state. `{ id, submittedAt }`. */
export async function latestDiagnostic(userId: string) {
  return firstRow(
    await db
      .select({
        id: mockAttempts.id,
        submittedAt: mockAttempts.submittedAt,
      })
      .from(mockAttempts)
      .where(
        and(
          eq(mockAttempts.userId, userId),
          eq(mockAttempts.kind, 'diagnostic'),
        ),
      )
      .orderBy(desc(mockAttempts.startedAt))
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
 * Accuracy per question kind. Feeds the skill matrix, the dashboard insight
 * and review's pattern detection -- one query, because they are three views
 * of the same fact and should never disagree.
 *
 * `multiple_choice` and `sentence_completion` are answered by both Reading
 * and Listening, so a kind alone no longer identifies one skill -- pass
 * `module` to scope to one (every existing caller wants exactly one skill's
 * view); omit it only for a caller that is itself module-aware and will use
 * the `module` each row now carries.
 */
export async function accuracyByQuestionKind(userId: string, module?: Skill) {
  const rows = await db
    .select({
      module: attempts.module,
      kind: questions.kind,
      value: attemptAnswers.value,
      answer: questionAnswers.answer,
    })
    .from(attemptAnswers)
    .innerJoin(attempts, eq(attempts.id, attemptAnswers.attemptId))
    .innerJoin(questions, eq(questions.id, attemptAnswers.questionId))
    .innerJoin(questionAnswers, eq(questionAnswers.questionId, questions.id))
    .where(
      and(
        eq(attempts.userId, userId),
        eq(attempts.status, 'complete'),
        module ? eq(attempts.module, module) : undefined,
      ),
    );

  const byKind = new Map<
    string,
    { module: Skill; kind: Question['kind']; correct: number; total: number }
  >();
  for (const row of rows) {
    const key = `${row.module}:${row.kind}`;
    const tally = byKind.get(key) ?? {
      module: row.module,
      kind: row.kind,
      correct: 0,
      total: 0,
    };
    tally.total += 1;
    if (isAnswerCorrect(row.answer, row.value)) tally.correct += 1;
    byKind.set(key, tally);
  }

  return [...byKind.values()].map((t) => ({
    ...t,
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
