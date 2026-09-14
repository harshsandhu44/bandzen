'use server';

import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { capture } from '@/lib/analytics';
import { requireUserId } from '@/lib/auth';
import { checkAwards } from '@/lib/award-check';
import {
  createAttempt,
  findInProgress,
  getAttempt,
  practiceAllowance,
  saveAnswer,
  saveListeningPlayback as savePlayback,
  submitListening,
  submitMockListening,
} from '@/lib/db/queries';
import { finishSittingSection } from '@/lib/mock-guard';

export async function startListeningAttempt(formData: FormData) {
  const trackId = String(formData.get('trackId') ?? '');
  if (!trackId) throw new Error('Missing track');

  const userId = await requireUserId();

  // Resume rather than stack up abandoned attempts on the same track.
  const existing = await findInProgress(userId, { trackId });
  if (existing) redirect(`/listening/${existing.id}`);

  // The gate. The list page already blurs the rows past this point, so a Free
  // candidate only reaches here by posting the form directly — check anyway.
  const quota = await practiceAllowance(userId, 'listening');
  if (!quota.allowed) redirect('/upgrade?from=listening_wall');

  const attempt = await createAttempt({ userId, module: 'listening', trackId });
  after(() => capture(userId, 'attempt_started', { module: 'listening' }));
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

/**
 * Practice audio can be paused, seeked and replayed; this records what was
 * used so the review can say so. Flushed from the player on each transport
 * event and every ~10s while playing — not at submit, which redirects away
 * before a fire-and-forget call would land.
 */
export async function saveListeningPlayback(input: {
  attemptId: string;
  pauses: number;
  seeks: number;
  listenedSeconds: number;
}) {
  const userId = await requireUserId();
  await savePlayback(userId, input.attemptId, {
    pauses: input.pauses,
    seeks: input.seeks,
    listenedSeconds: input.listenedSeconds,
  });
}

export async function submitListeningAttempt(formData: FormData) {
  const attemptId = String(formData.get('attemptId') ?? '');
  if (!attemptId) throw new Error('Missing attempt');

  const userId = await requireUserId();

  const before = await getAttempt(userId, attemptId);
  if (!before) throw new Error('Attempt not found');

  // Practice only — auto-scored, so submitted and graded are one instant.
  if (!before.mockAttemptId) {
    after(() =>
      capture(userId, 'attempt_submitted', {
        module: 'listening',
        attempt_id: attemptId,
      }),
    );
  }

  const graded = before.mockAttemptId
    ? await submitMockListening(userId, attemptId)
    : await submitListening(userId, attemptId);
  if (!graded) throw new Error('Attempt not found');

  if (!before.mockAttemptId) {
    after(() =>
      capture(userId, 'attempt_graded', {
        module: 'listening',
        attempt_id: attemptId,
        outcome: 'graded',
        overall_band: graded.band,
        playback_pauses: graded.playback?.pauses ?? 0,
        playback_seeks: graded.playback?.seeks ?? 0,
      }),
    );
  }

  await checkAwards(userId);

  if (graded.mockAttemptId) {
    await finishSittingSection(userId, graded.mockAttemptId);
  }

  redirect(`/listening/${attemptId}/review`);
}

export async function attemptStatus(attemptId: string) {
  const userId = await requireUserId();
  const attempt = await getAttempt(userId, attemptId);
  return attempt?.status ?? null;
}
