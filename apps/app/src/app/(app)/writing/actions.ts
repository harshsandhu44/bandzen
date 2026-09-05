'use server';

import { after } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import { gradeEssay } from '@/lib/ai/grade-essay';
import {
  claimFailedForGrading,
  claimForGrading,
  createAttempt,
  essayAllowance,
  findInProgress,
  getAttempt,
  getMockSectionAttempts,
  saveEssay,
} from '@/lib/db/queries';
import { finishSittingSection } from '@/lib/mock-guard';

export async function startWritingAttempt(formData: FormData) {
  const promptId = String(formData.get('promptId') ?? '');
  if (!promptId) throw new Error('Missing prompt');

  const userId = await requireUserId();

  // Resuming is always free — the mark was charged when the attempt was
  // created, and charging again for finishing it would be charging twice.
  const existing = await findInProgress(userId, { promptId });
  if (existing) redirect(`/writing/${existing.id}`);

  // The gate, and the only one on this path. Never at submit: an essay that
  // exists is always graded, because taking forty minutes of a candidate's
  // preparation and then refusing to mark it is the version of this that
  // deserves a chargeback.
  //
  // ponytail: check-then-insert, so two tabs opened at once can both pass and
  // spend one extra grading call. Neon is HTTP, so there is no transaction to
  // take, and a single guarded INSERT ... SELECT would only narrow the window
  // rather than close it. Worth revisiting if the leak ever shows up in cost.
  const quota = await essayAllowance(userId);
  if (!quota.allowed) redirect('/upgrade?from=writing_wall');

  const attempt = await createAttempt({ userId, module: 'writing', promptId });
  redirect(`/writing/${attempt.id}`);
}

/** Debounced autosave from the editor. */
export async function saveEssayDraft(input: {
  attemptId: string;
  body: string;
  wordCount: number;
}) {
  const userId = await requireUserId();
  await saveEssay(userId, input.attemptId, input.body, input.wordCount);
}

/**
 * Hand the candidate their waiting screen immediately, then grade.
 *
 * `after()` runs the callback once the response is flushed, so a 30-second
 * model call does not hold the redirect. The candidate can close the tab —
 * the report still lands, and the report page polls for it.
 */
export async function submitEssay(formData: FormData) {
  const attemptId = String(formData.get('attemptId') ?? '');
  if (!attemptId) throw new Error('Missing attempt');

  const userId = await requireUserId();
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt) notFound();

  // claimForGrading only succeeds for the caller that actually moves the row
  // out of in_progress, so a double submit never grades the same essay twice.
  if (await claimForGrading(userId, attemptId)) {
    after(() => gradeEssay(attemptId));
  }

  redirect(`/writing/${attemptId}/report`);
}

/**
 * Submit the Writing section of a sitting: every writing row under the
 * sitting, claimed and graded together. A mock has two (Task 1 + Task 2); a
 * diagnostic has one (Task 2). `formData`'s `attemptId` is the canonical row
 * the candidate is on; the siblings are looked up by `mockAttemptId` rather
 * than trusting a second hidden field. Same claim-then-grade-after shape as
 * `submitEssay`.
 */
export async function submitMockWriting(formData: FormData) {
  const attemptId = String(formData.get('attemptId') ?? '');
  if (!attemptId) throw new Error('Missing attempt');

  const userId = await requireUserId();
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.mockAttemptId) notFound();

  const siblings = await getMockSectionAttempts(
    userId,
    attempt.mockAttemptId,
    'writing',
  );

  for (const row of siblings) {
    if (await claimForGrading(userId, row.id)) {
      after(() => gradeEssay(row.id));
    }
  }

  // On to Speaking (mock, Pro diagnostic) or the result page (Free diagnostic
  // — Writing is its last section).
  await finishSittingSection(userId, attempt.mockAttemptId);
}

/**
 * Grade a failed attempt again.
 *
 * `gradeEssay` leaves `status` terminal on every exit path, so a transient
 * model or network failure lands the row on `failed` with the essay still
 * intact — and until now nothing could pick it back up. `findInProgress`
 * filters on `in_progress`, so pressing Start again created a *new* empty
 * attempt and the written response became unreachable. That was the bug the
 * report page's "try submitting again" told candidates to walk into.
 *
 * Same shape as `submitEssay`: claim atomically, then grade after the response
 * so a thirty-second model call does not hold the redirect.
 */
export async function retryGrading(formData: FormData) {
  const attemptId = String(formData.get('attemptId') ?? '');
  if (!attemptId) throw new Error('Missing attempt');

  const userId = await requireUserId();
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt) notFound();

  if (await claimFailedForGrading(userId, attemptId)) {
    after(() => gradeEssay(attemptId));
  }

  redirect(`/writing/${attemptId}/report`);
}

/** Polled by the report page while grading runs. */
export async function gradingStatus(attemptId: string) {
  const userId = await requireUserId();
  const attempt = await getAttempt(userId, attemptId);
  return attempt?.status ?? null;
}
