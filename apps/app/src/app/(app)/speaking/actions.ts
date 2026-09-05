'use server';

import { after } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import { gradeSpeaking } from '@/lib/ai/grade-speaking';
import {
  claimFailedForGrading,
  claimForGrading,
  createAttempt,
  findInProgress,
  getAttempt,
  isPro,
  saveSpeakingResponse,
  submitMockAttempt,
} from '@/lib/db/queries';
import { uploadObject } from '@bandzen/storage/r2';

export async function startSpeakingAttempt(formData: FormData) {
  const testId = String(formData.get('testId') ?? '');
  if (!testId) throw new Error('Missing test');

  const userId = await requireUserId();

  // Speaking is Pro-only — grading a test is the most expensive per-unit AI
  // cost in the app. This is the only gate; never at submit, because an
  // attempt that exists is always graded.
  if (!(await isPro(userId))) redirect('/upgrade?from=speaking_wall');

  // Resume rather than stack up abandoned attempts on the same test.
  const existing = await findInProgress(userId, { speakingTestId: testId });
  if (existing) redirect(`/speaking/${existing.id}`);

  const attempt = await createAttempt({
    userId,
    module: 'speaking',
    speakingTestId: testId,
  });
  redirect(`/speaking/${attempt.id}`);
}

/**
 * Store one recorded answer. Called from the client the moment a recording is
 * finished — the "never lose work" contract the exam engines all keep. The
 * WAV blob is posted as a file; R2 gets a fresh key every time so re-recording
 * a prompt never races a stale CDN copy.
 */
export async function saveSpeakingRecording(
  formData: FormData,
): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const attemptId = String(formData.get('attemptId') ?? '');
  const promptId = String(formData.get('promptId') ?? '');
  const file = formData.get('audio');
  const durationRaw = Number(formData.get('duration'));
  const duration = Number.isFinite(durationRaw)
    ? Math.round(durationRaw)
    : null;

  if (!attemptId || !promptId || !(file instanceof File) || file.size === 0) {
    return { ok: false };
  }

  const audioUrl = await uploadObject({
    key: `speaking/${crypto.randomUUID()}.wav`,
    body: Buffer.from(await file.arrayBuffer()),
    contentType: 'audio/wav',
  });

  await saveSpeakingResponse(userId, attemptId, promptId, audioUrl, duration);
  return { ok: true };
}

/**
 * Hand the candidate their waiting screen immediately, then grade.
 *
 * Same shape as `submitEssay`: `claimForGrading` is atomic on
 * `in_progress -> grading`, so a double submit never starts two graders, and
 * `after()` runs the model call past the flushed response so the candidate
 * can close the tab.
 */
export async function submitSpeakingAttempt(formData: FormData) {
  const attemptId = String(formData.get('attemptId') ?? '');
  if (!attemptId) throw new Error('Missing attempt');

  const userId = await requireUserId();
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt) notFound();

  if (await claimForGrading(userId, attemptId)) {
    after(() => gradeSpeaking(attemptId));
  }

  // Speaking is the mock's last section — this is what closes the sitting:
  // frees the weekly cap and lets `startMock` resume land at the result page
  // instead of looping back in. Stamped even though grading itself runs
  // after the response, same as every other mock section.
  if (attempt.kind === 'mock' && attempt.mockAttemptId) {
    await submitMockAttempt(userId, attempt.mockAttemptId);
    redirect(`/mock/${attempt.mockAttemptId}/result`);
  }

  redirect(`/speaking/${attemptId}/report`);
}

/** Grade a failed attempt again. Costs nothing — same as `retryGrading`. */
export async function retrySpeakingGrading(formData: FormData) {
  const attemptId = String(formData.get('attemptId') ?? '');
  if (!attemptId) throw new Error('Missing attempt');

  const userId = await requireUserId();
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt) notFound();

  if (await claimFailedForGrading(userId, attemptId)) {
    after(() => gradeSpeaking(attemptId));
  }

  redirect(`/speaking/${attemptId}/report`);
}
