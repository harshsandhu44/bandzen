'use server';

import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import { checkAwards } from '@/lib/award-check';
import {
  createAttempt,
  findInProgress,
  getAttempt,
  saveAnswer,
  submitListening,
  submitMockListening,
} from '@/lib/db/queries';

export async function startListeningAttempt(formData: FormData) {
  const trackId = String(formData.get('trackId') ?? '');
  if (!trackId) throw new Error('Missing track');

  const userId = await requireUserId();

  // Resume rather than stack up abandoned attempts on the same track.
  const existing = await findInProgress(userId, { trackId });
  if (existing) redirect(`/listening/${existing.id}`);

  const attempt = await createAttempt({ userId, module: 'listening', trackId });
  redirect(`/listening/${attempt.id}`);
}

/**
 * Autosave. Debounced client-side, so this runs on the order of once a
 * second at worst — not per keystroke. Delegates straight to the shared
 * `saveAnswer`, which is already module-agnostic.
 */
export async function saveListeningAnswer(input: {
  attemptId: string;
  questionId: string;
  value: string | null;
  flagged: boolean;
}) {
  const userId = await requireUserId();
  await saveAnswer(
    userId,
    input.attemptId,
    input.questionId,
    input.value,
    input.flagged,
  );
}

export async function submitListeningAttempt(formData: FormData) {
  const attemptId = String(formData.get('attemptId') ?? '');
  if (!attemptId) throw new Error('Missing attempt');

  const userId = await requireUserId();

  const before = await getAttempt(userId, attemptId);
  if (!before) throw new Error('Attempt not found');

  const graded =
    before.kind === 'mock'
      ? await submitMockListening(userId, attemptId)
      : await submitListening(userId, attemptId);
  if (!graded) throw new Error('Attempt not found');

  await checkAwards(userId);

  if (graded.kind === 'mock' && graded.mockAttemptId) {
    redirect(`/mock/${graded.mockAttemptId}/next?section=reading`);
  }

  redirect(`/listening/${attemptId}/review`);
}

export async function attemptStatus(attemptId: string) {
  const userId = await requireUserId();
  const attempt = await getAttempt(userId, attemptId);
  return attempt?.status ?? null;
}
