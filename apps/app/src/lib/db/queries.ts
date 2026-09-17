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
import {
  evaluatorFor,
  modelAssessment,
  objectiveAssessment,
  type AssessmentResult,
} from '@bandzen/exams/scoring';
import { preparationWrites, type PreparationValues } from '@/lib/enrollment';
import { union } from 'drizzle-orm/pg-core';
import { db } from './index';
import {
  accessRequests,
  attemptAnswers,
  attempts,
  awards,
  coachMessages,
  essays,
  examEnrollments,
  examTaskAnswers,
  examTaskResponses,
  examTasks,
  lessonProgress,
  listeningTracks,
  mockAttempts,
  officialScores,
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
  type Attempt,
  type Criterion,
  type ExamKey,
  type ListeningPlayback,
  type Award,
  type Question,
  type Skill,
} from './schema';

export {
  DIFFICULTY_RANGE,
  getPublishedExamTask,
  getPublishedExamTasks,
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
    .select({
      userId: profiles.userId,
      email: profiles.email,
      role: profiles.role,
      studyMinutes: profiles.studyMinutes,
      timezone: profiles.timezone,
      onboardingCompletedAt: profiles.onboardingCompletedAt,
      createdAt: profiles.createdAt,
      // The active enrollment's half. Null throughout until they pick an exam.
      examKey: examEnrollments.examKey,
      examVariant: examEnrollments.examVariant,
      examVersion: examEnrollments.examVersion,
      targetScore: examEnrollments.targetScore,
      selfAssessedScore: examEnrollments.selfAssessedScore,
      testDate: examEnrollments.testDate,
    })
    .from(profiles)
    .leftJoin(
      examEnrollments,
      and(
        eq(examEnrollments.userId, profiles.userId),
        eq(examEnrollments.examKey, profiles.activeExamKey),
      ),
    )
    .where(eq(profiles.userId, userId));
  return row ?? null;
});

/** A profile as the app sees it: the user's settings plus their active exam. */
export type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;

/**
 * Two writes, no transaction. The enrollment goes first so `active_exam_key`
 * never points at a row that does not exist yet.
 */
export async function upsertProfile(userId: string, values: PreparationValues) {
  const { enrollment, profile } = preparationWrites(values);

  await db
    .insert(examEnrollments)
    .values({ userId, ...enrollment })
    .onConflictDoUpdate({
      target: [examEnrollments.userId, examEnrollments.examKey],
      // Not the version: that is the format they enrolled under, and editing a
      // target does not move them onto a newer one.
      set: {
        examVariant: enrollment.examVariant,
        targetScore: enrollment.targetScore,
        selfAssessedScore: enrollment.selfAssessedScore,
        testDate: enrollment.testDate,
        updatedAt: new Date(),
      },
    });

  const insert = db
    .insert(profiles)
    // A brand-new profile points at the enrollment just written, even when the
    // save did not name its exam.
    .values({
      userId,
      ...profile,
      activeExamKey: profile.activeExamKey ?? enrollment.examKey,
    });

  // The diagnostic's target-and-date save leaves every profile field
  // undefined, and Drizzle throws "No values to set" on an empty update.
  // The signup trigger means the row always exists, so that save always hit it.
  await (Object.values(profile).some((v) => v !== undefined)
    ? insert.onConflictDoUpdate({ target: profiles.userId, set: profile })
    : insert.onConflictDoNothing());
}

/** Every exam this candidate has set up, oldest first. */
export async function listEnrollments(userId: string) {
  return db
    .select({
      examKey: examEnrollments.examKey,
      examVariant: examEnrollments.examVariant,
      targetScore: examEnrollments.targetScore,
      testDate: examEnrollments.testDate,
    })
    .from(examEnrollments)
    .where(eq(examEnrollments.userId, userId))
    .orderBy(examEnrollments.createdAt);
}

/**
 * Make one of the candidate's exams the active one. Only to an exam they have
 * already set up — switching to a new exam goes through Settings, which asks
 * for its target. Nothing else changes: every enrollment and every attempt
 * stays exactly as it was. Returns whether it switched.
 */
export async function setActiveExam(userId: string, examKey: ExamKey) {
  const [row] = await db
    .update(profiles)
    .set({ activeExamKey: examKey })
    .where(
      and(
        eq(profiles.userId, userId),
        sql`exists (select 1 from ${examEnrollments} where ${examEnrollments.userId} = ${userId} and ${examEnrollments.examKey} = ${examKey})`,
      ),
    )
    .returning({ userId: profiles.userId });
  return row != null;
}

/**
 * Whether an exam has any published practice content. This is what decides
 * between an exam's real screens and its honest "on the way" state, so the
 * day PTE content is published the switch flips without a deploy.
 */
export const examHasContent = cache(async function examHasContent(
  examKey: ExamKey,
) {
  // `exam_tasks` counts from here on: it is the only content PTE, TOEFL and DET
  // have, and a published item of it is now something a candidate can actually
  // sit. Until the runner existed, counting it would have promised a screen
  // that did not exist.
  const found = await Promise.all(
    [passages, writingPrompts, listeningTracks, speakingTests, examTasks].map(
      (table) =>
        db
          .select({ id: table.id })
          .from(table)
          .where(and(eq(table.examKey, examKey), eq(table.status, 'published')))
          .limit(1),
    ),
  );
  return found.some((rows) => rows.length > 0);
});

/**
 * The task types this exam has published content for. A study plan only
 * schedules a drill it can actually open, so a task type with no item is not
 * offered at all rather than handed over as a dead link.
 */
export const publishedExamTaskTypes = cache(
  async function publishedExamTaskTypes(examKey: ExamKey) {
    const rows = await db
      .selectDistinct({ taskType: examTasks.taskType })
      .from(examTasks)
      .where(
        and(eq(examTasks.examKey, examKey), eq(examTasks.status, 'published')),
      );
    return rows.map((r) => r.taskType);
  },
);

/** The exams this candidate has completed attempts in, for Progress's filter. */
export async function attemptExams(userId: string) {
  const rows = await db
    .selectDistinct({ examKey: attempts.examKey })
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.status, 'complete')));
  return rows.map((r) => r.examKey);
}

/**
 * Finish onboarding. Separate from `upsertProfile` only because it is the one
 * write that may stamp the completion time, and stamping it from a settings
 * edit would be wrong.
 */
export async function completeOnboarding(
  userId: string,
  values: Omit<PreparationValues, 'onboardingCompletedAt'>,
) {
  await upsertProfile(userId, { ...values, onboardingCompletedAt: new Date() });
}

/** Any published track's audio, for the staff task lab's audio stimuli. */
export async function sampleAudioUrl() {
  const [row] = await db
    .select({ url: listeningTracks.audioUrl })
    .from(listeningTracks)
    .where(
      and(
        eq(listeningTracks.status, 'published'),
        isNotNull(listeningTracks.audioUrl),
      ),
    )
    .limit(1);
  return row?.url ?? null;
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
    if (m.writingTask2PromptId) promptIds.add(m.writingTask2PromptId);
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
  const [row] = await db
    .insert(mockAttempts)
    .values({
      ...values,
      // A sitting is the variant its reading passages were picked for.
      examVariant: sql`(select format::text from passages where id = ${values.readingPassageIds[0] ?? null})`,
    })
    .returning();
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
 * once `submittedAt` is stamped — which happens when Speaking, the last
 * section, submits. A sitting abandoned part way has a null `submittedAt` and
 * does not count, deliberately: the free diagnostic is the demonstration the
 * whole funnel points at, and a sitting that broke must not be the thing that
 * locks someone out of it forever. Legacy 2-skill diagnostics are backfilled
 * with `submittedAt` set, so they still count here.
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
 * Write what Polar told us, from either the checkout read-back or the webhook.
 *
 * Two guards, because Polar delivers at-least-once and does not promise order.
 * Keyed on the user, so a replay is a no-op by construction; and gated on
 * `last_event_at`, so an event delayed behind a newer one is dropped rather
 * than applied. Without that second guard a renewal replayed after a
 * revocation would hand Pro back to a refunded account.
 *
 * `greatest` on the date is belt to that brace, and it also covers the grant
 * case: a candidate who buys while a founding grant still has time keeps
 * whichever date is further out rather than losing days they already had.
 *
 * `source` is kept from the first write — it records which prompt earned the
 * subscription, and a renewal did not earn it again. `currency` and
 * `amountMinor` coalesce the other way: a later event knows the money better
 * than the first one did, and only a null should leave what is there alone.
 */
export async function activateSubscription(values: {
  userId: string;
  polarSubscriptionId: string | null;
  planId: string;
  status: string;
  currentPeriodEnd: Date;
  source?: string | null;
  currency?: string | null;
  amountMinor?: number | null;
  lastEventAt?: Date | null;
}) {
  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        polarSubscriptionId: sql`excluded.polar_subscription_id`,
        planId: sql`excluded.plan_id`,
        status: sql`excluded.status`,
        currentPeriodEnd: sql`greatest(${subscriptions.currentPeriodEnd}, excluded.current_period_end)`,
        source: sql`coalesce(${subscriptions.source}, excluded.source)`,
        currency: sql`coalesce(excluded.currency, ${subscriptions.currency})`,
        amountMinor: sql`coalesce(excluded.amount_minor, ${subscriptions.amountMinor})`,
        lastEventAt: sql`excluded.last_event_at`,
        updatedAt: new Date(),
      },
      setWhere: sql`excluded.last_event_at is null
        or ${subscriptions.lastEventAt} is null
        or excluded.last_event_at >= ${subscriptions.lastEventAt}`,
    });
}

/**
 * Comp someone — the founding cohort. No code path calls this; it is the
 * mechanism a founding grant is applied by hand (a one-off from a console).
 *
 * `onConflictDoNothing`, deliberately not the upsert above: one row per user,
 * enforced by the primary key, so a re-run is a no-op rather than a way to
 * extend the grant.
 */
export async function grantPro(
  userId: string,
  planId: 'founding',
  endsAt: Date,
) {
  await db
    .insert(subscriptions)
    .values({
      userId,
      polarSubscriptionId: null,
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

/**
 * Pass `examKey` wherever scores are compared or plotted: two exams' scores
 * are on different scales and must never share a list or a line.
 */
export async function listCompletedAttempts(
  userId: string,
  limit = 20,
  examKey?: ExamKey,
) {
  return db
    .select({
      id: attempts.id,
      examKey: attempts.examKey,
      module: attempts.module,
      kind: attempts.kind,
      band: attempts.score,
      submittedAt: attempts.submittedAt,
    })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, userId),
        eq(attempts.status, 'complete'),
        examKey ? eq(attempts.examKey, examKey) : undefined,
      ),
    )
    .orderBy(desc(attempts.submittedAt))
    .limit(limit);
}

export async function latestBand(
  userId: string,
  module: Skill,
  examKey?: ExamKey,
) {
  const [row] = await db
    .select({ band: attempts.score })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, userId),
        eq(attempts.module, module),
        eq(attempts.status, 'complete'),
        isNotNull(attempts.score),
        examKey ? eq(attempts.examKey, examKey) : undefined,
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

/**
 * Only IELTS Reading and Writing differ between Academic and General Training,
 * so only they carry a variant: their passage's or prompt's, or failing that
 * (a mock section spans several passages) the sitting's.
 */
function attemptVariant(values: {
  module: Skill;
  passageId?: string;
  promptId?: string;
  mockAttemptId?: string;
}) {
  if (values.module !== 'reading' && values.module !== 'writing') return null;
  return sql<string | null>`coalesce(
    (select format::text from passages where id = ${values.passageId ?? null}),
    (select format::text from writing_prompts where id = ${values.promptId ?? null}),
    (select exam_variant from mock_attempts where id = ${values.mockAttemptId ?? null})
  )`;
}

type AttemptIdentity = Pick<
  Attempt,
  'examKey' | 'examVersion' | 'taskType' | 'module'
>;

const identity = (attempt: AttemptIdentity) => ({
  exam: attempt.examKey,
  examVersion: attempt.examVersion,
  taskType: attempt.taskType ?? attempt.module,
  skill: attempt.module,
});

/** A marked Reading or Listening attempt: its score and its assessment. */
const objectiveResult = (
  attempt: AttemptIdentity,
  correct: number,
  total: number,
) => {
  // `readingBand` is IELTS's own 40-question conversion, and was being applied
  // to every objective attempt in the app whatever exam it belonged to. Another
  // exam gets its marks and no score here: PTE reports at the level of a whole
  // sitting, not per item, so its estimate is assembled there instead.
  const band = attempt.examKey === 'ielts' ? readingBand(correct, total) : null;
  return {
    score: band,
    assessment: objectiveAssessment({
      ...identity(attempt),
      correct,
      total,
      score: band,
    }),
  };
};

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
    .values({
      ...values,
      examVariant: attemptVariant(values),
      taskType: {
        reading: values.passageId ? 'reading_passage' : 'reading_section',
        listening: values.trackId ? 'listening_track' : 'listening_section',
        writing: sql`(select 'writing_task_' || task from writing_prompts where id = ${values.promptId ?? null})`,
        speaking: 'speaking_test',
      }[values.module],
    })
    .returning({ id: attempts.id });
  if (!row) throw new Error('Could not create attempt');
  if (values.module === 'writing') {
    await db.insert(essays).values({ attemptId: row.id }).onConflictDoNothing();
  }
  return row;
}

/**
 * A real score the candidate reports back from the actual exam.
 *
 * Kept apart from every estimate on purpose: this is the only number in the
 * system that is not a guess, and the point of storing it is to measure the
 * guesses against it later. Nothing averages the two.
 */
export async function recordOfficialScore(values: {
  userId: string;
  examKey: ExamKey;
  examVersion: string;
  score: number;
  takenOn: string | null;
  /** The sitting this is the truth for, already checked to be theirs. */
  mockAttemptId?: string | null;
  /** Bandzen's estimate for that sitting, frozen as it stood right now. */
  estimatedScore?: number | null;
  scoringVersion?: string | null;
}) {
  const [row] = await db.insert(officialScores).values(values).returning({
    id: officialScores.id,
  });
  return row ?? null;
}

/** This candidate's reported real scores for one exam, newest first. */
export async function listOfficialScores(userId: string, examKey: ExamKey) {
  return db
    .select()
    .from(officialScores)
    .where(
      and(
        eq(officialScores.userId, userId),
        eq(officialScores.examKey, examKey),
      ),
    )
    .orderBy(desc(officialScores.createdAt));
}

// ---------------------------------------------------------------------------
// Exam-task sittings
//
// A sitting whose content is a list of task items rather than IELTS's four
// tables. The engine around it — position, lockstep, the interstitial — is the
// same one; only the content and the order differ.
// ---------------------------------------------------------------------------

/** Every published item of an exam, for a sitting to be composed from. */
export async function listPublishedExamTasks(examKey: ExamKey) {
  return db
    .select({
      id: examTasks.id,
      slug: examTasks.slug,
      taskType: examTasks.taskType,
      section: examTasks.section,
    })
    .from(examTasks)
    .where(
      and(eq(examTasks.examKey, examKey), eq(examTasks.status, 'published')),
    )
    .orderBy(examTasks.taskType, examTasks.slug);
}

/**
 * The items a sitting already locked, by id, whatever their status now is.
 *
 * Deliberately not filtered by `published`: the sitting chose these, and
 * unpublishing one afterwards must not shorten a test somebody is part way
 * through. Only `startMock` cares whether a task is published, because only it
 * is still choosing.
 *
 * Content, never answers — `exam_task_answers` is a separate table for exactly
 * that reason.
 */
export async function getExamTasksByIds(ids: readonly string[]) {
  if (!ids.length) return [];
  return db
    .select({
      id: examTasks.id,
      slug: examTasks.slug,
      taskType: examTasks.taskType,
      section: examTasks.section,
    })
    .from(examTasks)
    .where(inArray(examTasks.id, [...ids]));
}

/**
 * Start a sitting over a fixed list of task items.
 *
 * The list is locked in here, for the same reason a practice session's is: a
 * sitting that re-picked on every page load would not be the test the
 * candidate started. The IELTS content columns stay empty — this sitting has
 * no passages, tracks or prompts of its own.
 */
export async function createExamTaskSitting(values: {
  userId: string;
  examKey: ExamKey;
  examVersion: string;
  taskIds: string[];
}) {
  const [row] = await db
    .insert(mockAttempts)
    .values({
      userId: values.userId,
      kind: 'mock',
      examKey: values.examKey,
      examVersion: values.examVersion,
      readingPassageIds: [],
      listeningTrackIds: [],
      writingTask1PromptId: null,
      writingTask2PromptId: null,
      speakingTestId: null,
      taskIds: values.taskIds,
    })
    .returning();
  if (!row) throw new Error('Could not create sitting');
  return row;
}

/** A finished exam-task sitting and every section attempt under it. */
export async function getExamTaskSitting(userId: string, sittingId: string) {
  const mock = await getMockAttempt(userId, sittingId);
  if (!mock?.taskIds) return null;

  const rows = await db
    .select()
    .from(attempts)
    .where(
      and(eq(attempts.userId, userId), eq(attempts.mockAttemptId, sittingId)),
    );

  return { mock, sections: rows };
}

// ---------------------------------------------------------------------------
// Exam tasks
//
// Every exam but IELTS, whose Reading/Listening answers stay in
// `attempt_answers` against its own `questions` table. These four functions are
// the whole persistence leg: create, load, save, submit.
// ---------------------------------------------------------------------------

/**
 * Start a session over `taskIds` of one task type.
 *
 * The chosen items are written as empty response rows up front, and that is
 * deliberate: it is what locks the item set in. Without it a refresh would
 * re-pick from a bank that may have grown, and the candidate would find a
 * different test than the one they started.
 */
export async function createExamTaskAttempt(values: {
  userId: string;
  examKey: ExamKey;
  examVersion: string;
  taskType: string;
  module: Skill;
  taskIds: string[];
  mockAttemptId?: string;
}) {
  const [row] = await db
    .insert(attempts)
    .values({
      userId: values.userId,
      module: values.module,
      kind: values.mockAttemptId ? 'mock' : 'practice',
      examKey: values.examKey,
      examVersion: values.examVersion,
      taskType: values.taskType,
      mockAttemptId: values.mockAttemptId,
    })
    .returning({ id: attempts.id });
  if (!row) throw new Error('Could not create attempt');

  if (values.taskIds.length) {
    await db
      .insert(examTaskResponses)
      .values(values.taskIds.map((taskId) => ({ attemptId: row.id, taskId })))
      .onConflictDoNothing();
  }
  return row;
}

/**
 * This candidate's open practice session of one task type, if any. Resuming it
 * is what stops a second click on Start from stacking up abandoned attempts —
 * the same thing `findInProgress` does for the IELTS modules. Sitting sections
 * are excluded: those are the sitting's to create and resume.
 */
export async function findInProgressExamTask(
  userId: string,
  examKey: ExamKey,
  taskType: string,
) {
  return firstRow(
    await db
      .select({ id: attempts.id })
      .from(attempts)
      .where(
        and(
          eq(attempts.userId, userId),
          eq(attempts.status, 'in_progress'),
          eq(attempts.examKey, examKey),
          eq(attempts.taskType, taskType),
          isNull(attempts.mockAttemptId),
        ),
      )
      .limit(1),
  );
}

/**
 * An exam-task attempt as its runner needs it: the items in their locked
 * order, with the answers so far.
 *
 * Selects `exam_tasks.content` and never joins `exam_task_answers`, so the
 * answer key and the transcript cannot reach a page an attempt is running in.
 */
export async function getExamTaskAttempt(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.taskType) return null;

  const items = await db
    .select({
      taskId: examTasks.id,
      slug: examTasks.slug,
      title: examTasks.title,
      content: examTasks.content,
      value: examTaskResponses.value,
      audioUrl: examTaskResponses.audioUrl,
      flagged: examTaskResponses.flagged,
    })
    .from(examTaskResponses)
    .innerJoin(examTasks, eq(examTasks.id, examTaskResponses.taskId))
    .where(eq(examTaskResponses.attemptId, attemptId))
    .orderBy(sql`(${examTasks.content} ->> 'difficulty')::int`, examTasks.slug);

  return { attempt, items };
}

/**
 * Autosave one answer. Guarded exactly as `saveAnswer` is: the table has no
 * `user_id` of its own, so without this check an attempt id from anywhere
 * would be writable.
 *
 * The row already exists — `createExamTaskAttempt` wrote it — so this updates
 * rather than upserts, and an id that is not part of this attempt touches
 * nothing instead of quietly joining it.
 */
export async function saveExamTaskResponse(
  userId: string,
  attemptId: string,
  taskId: string,
  values: {
    value?: string | null;
    audioUrl?: string | null;
    flagged?: boolean;
  },
) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt || attempt.status !== 'in_progress') return;

  await db
    .update(examTaskResponses)
    .set({ ...values, updatedAt: new Date() })
    .where(
      and(
        eq(examTaskResponses.attemptId, attemptId),
        eq(examTaskResponses.taskId, taskId),
      ),
    );
}

/**
 * Mark and close an exam-task attempt.
 *
 * Only deterministic task types are marked here. PTE's nine model-graded types
 * have no rubric yet, so they finish unscored rather than being given a number
 * nobody computed — #93 adds the rubrics and #96 the 10–90 estimate. Either
 * way the attempt reaches a terminal status: a row stuck on `in_progress` is a
 * review page that never opens.
 *
 * The answer keys are read here, at submit time, on the server. They are
 * joined to nothing the runner ever loads.
 */
export async function submitExamTaskAttempt(userId: string, attemptId: string) {
  const [claimed] = await db
    .update(attempts)
    .set({ status: 'grading' })
    .where(
      and(ownAttempt(userId, attemptId), eq(attempts.status, 'in_progress')),
    )
    .returning({ id: attempts.id });
  if (!claimed) return null;

  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.taskType) return null;

  const rows = await db
    .select({
      value: examTaskResponses.value,
      answer: examTaskAnswers.answer,
    })
    .from(examTaskResponses)
    .leftJoin(
      examTaskAnswers,
      eq(examTaskAnswers.taskId, examTaskResponses.taskId),
    )
    .where(eq(examTaskResponses.attemptId, attemptId));

  const evaluator = evaluatorFor(attempt.examKey, attempt.taskType);

  // A model-graded task type stays on `grading`: the caller kicks the grader
  // off in `after()`, and `gradeExamTask` is what moves it to a terminal
  // status. Closing it here would be a finished attempt with nothing in it.
  if (evaluator.kind === 'model') {
    return {
      id: attemptId,
      mockAttemptId: attempt.mockAttemptId,
      needsModel: true,
    };
  }

  const marked = evaluator.mark
    ? rows.reduce(
        (acc, row) => {
          const { correct, total } = evaluator.mark!(
            row.answer ?? [],
            row.value,
          );
          return { correct: acc.correct + correct, total: acc.total + total };
        },
        { correct: 0, total: 0 },
      )
    : null;

  const [row] = await db
    .update(attempts)
    .set({
      status: 'complete',
      submittedAt: new Date(),
      rawScore: marked?.correct ?? null,
      total: marked?.total ?? null,
      // Raw marks only. Mapping them onto PTE's 10–90 scale is #96's job, and
      // writing an IELTS band here — as `objectiveResult` still does for every
      // other objective attempt — would be a number from the wrong exam.
      assessment: marked
        ? objectiveAssessment({
            exam: attempt.examKey,
            examVersion: attempt.examVersion,
            taskType: attempt.taskType,
            skill: attempt.module,
            correct: marked.correct,
            total: marked.total,
            score: null,
          })
        : null,
    })
    .where(eq(attempts.id, attemptId))
    .returning({ id: attempts.id, mockAttemptId: attempts.mockAttemptId });
  return row ? { ...row, needsModel: false } : null;
}

/**
 * One exam-task attempt as its grader needs it: the items, what the candidate
 * answered, and the transcript of anything they were played.
 *
 * Takes no userId — like `loadForGrading`, it only ever runs for an attempt
 * `submitExamTaskAttempt` has already claimed. The transcript is read here
 * because the grader is server-side; it never travels to a browser mid-attempt.
 */
export async function loadExamTaskForGrading(attemptId: string) {
  const [attempt] = await db
    .select()
    .from(attempts)
    .where(eq(attempts.id, attemptId));
  if (!attempt?.taskType) return null;

  const items = await db
    .select({
      taskId: examTasks.id,
      content: examTasks.content,
      value: examTaskResponses.value,
      audioUrl: examTaskResponses.audioUrl,
      // Answer Short Question's accepted answers, matched in code.
      answer: examTaskAnswers.answer,
      transcript: examTaskAnswers.transcript,
    })
    .from(examTaskResponses)
    .innerJoin(examTasks, eq(examTasks.id, examTaskResponses.taskId))
    .leftJoin(
      examTaskAnswers,
      eq(examTaskAnswers.taskId, examTaskResponses.taskId),
    )
    .where(eq(examTaskResponses.attemptId, attemptId))
    .orderBy(sql`(${examTasks.content} ->> 'difficulty')::int`, examTasks.slug);

  return { attempt, items };
}

/** Close a model-graded exam-task attempt with what the grader produced. */
export async function writeExamTaskAssessment(
  attemptId: string,
  assessment: AssessmentResult,
) {
  const [row] = await db
    .update(attempts)
    .set({ status: 'complete', submittedAt: new Date(), assessment })
    .where(eq(attempts.id, attemptId))
    .returning({ userId: attempts.userId });
  return row?.userId ?? null;
}

/**
 * A finished exam-task attempt, with the answer keys.
 *
 * The keys are the reason this is separate from `getExamTaskAttempt`: they may
 * only be read once the attempt is over, so this refuses anything still in
 * progress rather than leaving that to its caller to remember.
 */
export async function getExamTaskReview(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.taskType || attempt.status !== 'complete') return null;

  const items = await db
    .select({
      taskId: examTasks.id,
      title: examTasks.title,
      content: examTasks.content,
      value: examTaskResponses.value,
      audioUrl: examTaskResponses.audioUrl,
      answer: examTaskAnswers.answer,
      transcript: examTaskAnswers.transcript,
    })
    .from(examTaskResponses)
    .innerJoin(examTasks, eq(examTasks.id, examTaskResponses.taskId))
    .leftJoin(
      examTaskAnswers,
      eq(examTaskAnswers.taskId, examTaskResponses.taskId),
    )
    .where(eq(examTaskResponses.attemptId, attemptId))
    .orderBy(sql`(${examTasks.content} ->> 'difficulty')::int`, examTasks.slug);

  return { attempt, items };
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export async function getReadingTest(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.passageId) return null;

  const [passage] = await db
    .select({
      id: passages.id,
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
 * Record what the practice listening player was used for. Guarded the same
 * way `saveAnswer` is, plus `mock_attempt_id IS NULL`: without the
 * `in_progress` check a candidate could rewrite their own counters after
 * submitting and scrub the condition line off their review.
 */
export async function saveListeningPlayback(
  userId: string,
  attemptId: string,
  playback: ListeningPlayback,
) {
  await db
    .update(attempts)
    .set({ playback })
    .where(
      and(
        ownAttempt(userId, attemptId),
        eq(attempts.status, 'in_progress'),
        eq(attempts.module, 'listening'),
        isNull(attempts.mockAttemptId),
      ),
    );
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
      ...objectiveResult(attempt, correct, total),
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
          sectionId: p.id,
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

/** Grades all 3 passages in one pass and writes one aggregate score, same rule as `submitReading`. */
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
      ...objectiveResult(attempt, correct, total),
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
    .select({ id: passages.id, title: passages.title, body: passages.body })
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
      ...objectiveResult(attempt, correct, total),
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
          sectionId: t.id,
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

/** Grades all 4 tracks in one pass and writes one aggregate score, same rule as `submitListening`. */
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
      ...objectiveResult(attempt, correct, total),
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
      durationSeconds: listeningTracks.durationSeconds,
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
    .select({
      speakingTestId: attempts.speakingTestId,
      examKey: attempts.examKey,
    })
    .from(attempts)
    .where(eq(attempts.id, attemptId));
  if (!attempt?.speakingTestId) return null;

  const [test] = await db
    .select({ title: speakingTests.title })
    .from(speakingTests)
    .where(eq(speakingTests.id, attempt.speakingTestId));
  if (!test) return null;

  // Left join, not inner: every prompt in the test comes back, with a null
  // `audioUrl` for the ones the candidate never recorded. The grader needs to
  // see the gaps — a test where nine of ten prompts went unanswered is not a
  // Band 6 just because the one answer was fluent.
  const rows = await db
    .select({
      promptId: speakingPrompts.id,
      idx: speakingPrompts.idx,
      part: speakingPrompts.part,
      text: speakingPrompts.text,
      audioUrl: speakingResponses.audioUrl,
    })
    .from(speakingPrompts)
    .leftJoin(
      speakingResponses,
      and(
        eq(speakingResponses.promptId, speakingPrompts.id),
        eq(speakingResponses.attemptId, attemptId),
      ),
    )
    .where(eq(speakingPrompts.testId, attempt.speakingTestId))
    .orderBy(speakingPrompts.idx);

  return { title: test.title, examKey: attempt.examKey, prompts: rows };
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
    ...(mock.writingTask2PromptId ? [mock.writingTask2PromptId] : []),
  ];
  // An exam-task sitting has no IELTS prompts, so there is no writing section
  // of this shape to load.
  if (!promptIds.length) return null;

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
    .where(
      inArray(
        essays.attemptId,
        rows.map((r) => r.id),
      ),
    );
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
export async function bandHistory(
  userId: string,
  module?: Skill,
  examKey?: ExamKey,
) {
  return db
    .select({
      module: attempts.module,
      band: attempts.score,
      submittedAt: attempts.submittedAt,
    })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, userId),
        eq(attempts.status, 'complete'),
        isNotNull(attempts.score),
        isNotNull(attempts.submittedAt),
        ...(module ? [eq(attempts.module, module)] : []),
        ...(examKey ? [eq(attempts.examKey, examKey)] : []),
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

/**
 * The newest report for this candidate, newest first.
 *
 * `module` is not optional in practice: `reports` holds Speaking rows too --
 * `gradeSpeaking` writes through the same `writeReport` -- so omitting it
 * returns whichever of the two graded most recently. Every caller here wants
 * one module and says so; the parameter stays optional only for a caller that
 * genuinely wants "the last thing graded, whatever it was".
 */
export async function latestReport(userId: string, module?: Skill) {
  return firstRow(
    await db
      .select({
        attemptId: reports.attemptId,
        criteria: reports.criteria,
        strengths: reports.strengths,
        weaknesses: reports.weaknesses,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .innerJoin(attempts, eq(attempts.id, reports.attemptId))
      .where(
        module
          ? and(eq(attempts.userId, userId), eq(attempts.module, module))
          : eq(attempts.userId, userId),
      )
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
      examKey: attempts.examKey,
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
  // `band` is what the IELTS grader produced; `score` is the only column it is
  // stored in now.
  const { band, ...rest } = values;
  const report = { ...rest, score: band };
  await db
    .insert(reports)
    .values({ attemptId, ...report })
    .onConflictDoUpdate({ target: reports.attemptId, set: report });

  // The same normalised result the objective modules write, built here so
  // both graders get it without assembling it themselves.
  const [attempt] = await db
    .select({
      examKey: attempts.examKey,
      examVersion: attempts.examVersion,
      taskType: attempts.taskType,
      module: attempts.module,
    })
    .from(attempts)
    .where(eq(attempts.id, attemptId));
  const assessment = attempt
    ? modelAssessment({
        ...identity(attempt),
        score: values.band,
        criteria: values.criteria,
        feedback: values.annotations,
        strengths: values.strengths,
        weaknesses: values.weaknesses,
      })
    : null;

  // Returns the owner because this is where a writing attempt becomes a study
  // day -- `submitEssay` leaves it on 'grading' -- and the caller has no userId
  // of its own to check awards with.
  const [row] = await db
    .update(attempts)
    .set({
      status: 'complete',
      score: values.band,
      assessment,
      submittedAt: new Date(),
    })
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
  // Returns the owner for the same reason `writeReport` does: the grader has
  // no userId of its own and needs one to report the failed attempt.
  const [row] = await db
    .update(attempts)
    .set({ status: 'failed' })
    .where(eq(attempts.id, attemptId))
    .returning({ userId: attempts.userId });
  return row?.userId ?? null;
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
 * held on every single activity. It also means writing these without a
 * transaction costs nothing here — a write that fails is simply retried, in
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
