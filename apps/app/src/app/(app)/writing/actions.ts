'use server';

import { after } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import { gradeEssay } from '@/lib/ai/grade-essay';
import {
  claimForGrading,
  createAttempt,
  findInProgress,
  getAttempt,
  saveEssay,
} from '@/lib/db/queries';

export async function startWritingAttempt(formData: FormData) {
  const promptId = String(formData.get('promptId') ?? '');
  if (!promptId) throw new Error('Missing prompt');

  const userId = await requireUserId();

  const existing = await findInProgress(userId, { promptId });
  if (existing) redirect(`/writing/${existing.id}`);

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

  if (attempt.kind === 'diagnostic' && attempt.parentId) {
    redirect(`/diagnostic/${attempt.parentId}/result`);
  }

  redirect(`/writing/${attemptId}/report`);
}

/** Polled by the report page while grading runs. */
export async function gradingStatus(attemptId: string) {
  const userId = await requireUserId();
  const attempt = await getAttempt(userId, attemptId);
  return attempt?.status ?? null;
}
