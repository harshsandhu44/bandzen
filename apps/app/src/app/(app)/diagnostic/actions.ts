'use server';

import { notFound, redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import {
  createAttempt,
  createMockAttempt,
  diagnosticCount,
  getMockAttempt,
  getMockSectionAttempts,
  getMockSiblings,
  isPro,
  latestDiagnostic,
  latestOpenDiagnostic,
  mockContentExclusions,
  pickRandomPassages,
  pickRandomPrompt,
  pickRandomSpeakingTest,
  pickRandomTracks,
  upsertProfile,
} from '@/lib/db/queries';
import { canStartDiagnostic } from '@/lib/entitlements';
import {
  DIAGNOSTIC_PASSAGES,
  DIAGNOSTIC_TRACKS,
  mockPosition,
  mockSectionUrl,
} from '@/lib/mock';

/**
 * Start (or resume) the diagnostic — a trimmed four-skill sitting on the same
 * engine as `/mock`: a `mock_attempts` row with `kind = 'diagnostic'`, its
 * section `attempts` created lazily as the candidate reaches each one.
 *
 * Two passages, two tracks, one Task 2 essay, and — for Pro — a full speaking
 * interview. On Free the sitting closes after Writing and Speaking is a locked
 * card on the result. Resuming is always free.
 */
export async function startDiagnostic(formData: FormData) {
  const targetBand = Number(String(formData.get('targetBand') ?? ''));
  if (!Number.isFinite(targetBand) || targetBand < 4 || targetBand > 9) {
    throw new Error('Target band must be between 4 and 9');
  }

  const rawDate = String(formData.get('testDate') ?? '').trim();
  if (rawDate && !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    throw new Error('Test date must be a calendar date');
  }

  const userId = await requireUserId();
  await upsertProfile(userId, { targetBand, testDate: rawDate || null });

  const [open, pro] = await Promise.all([
    latestOpenDiagnostic(userId),
    isPro(userId),
  ]);

  if (open) {
    const siblings = await getMockSiblings(userId, open.id);
    redirect(
      mockSectionUrl(
        open.id,
        mockPosition(siblings, { includeSpeaking: pro }),
        'diagnostic',
      ),
    );
  }

  // The gate — unchanged rule: first diagnostic free, retakes are Pro. A spent
  // diagnostic lands the candidate back on their last result.
  const taken = await diagnosticCount(userId);
  if (!canStartDiagnostic({ isPro: pro, taken })) {
    const latest = await latestDiagnostic(userId);
    if (latest) redirect(`/diagnostic/${latest.id}/result`);
    redirect('/upgrade?from=diagnostic_wall');
  }

  const exclusions = await mockContentExclusions(userId);
  const [passages, tracks, task2, speakingTest] = await Promise.all([
    pickRandomPassages(DIAGNOSTIC_PASSAGES, exclusions.passageIds),
    pickRandomTracks(DIAGNOSTIC_TRACKS, exclusions.trackIds),
    pickRandomPrompt(2, exclusions.promptIds),
    pickRandomSpeakingTest(exclusions.speakingTestIds),
  ]);

  if (passages.length < DIAGNOSTIC_PASSAGES)
    throw new Error('Not enough passages seeded for a diagnostic');
  if (tracks.length < DIAGNOSTIC_TRACKS)
    throw new Error('Not enough listening tracks seeded for a diagnostic');
  if (!task2) throw new Error('No Task 2 prompt seeded — see apps/app/README.md');
  if (!speakingTest)
    throw new Error('No speaking test seeded — see apps/app/README.md');

  const sitting = await createMockAttempt({
    userId,
    kind: 'diagnostic',
    readingPassageIds: passages.map((p) => p.id),
    listeningTrackIds: tracks.map((t) => t.id),
    writingTask1PromptId: null,
    writingTask2PromptId: task2.id,
    speakingTestId: speakingTest.id,
  });

  redirect(`/diagnostic/${sitting.id}/next?section=listening`);
}

/**
 * Add Speaking to a diagnostic that closed at Writing on Free, once the
 * candidate is Pro. Appends a speaking section to the same sitting — no full
 * retake — and its report/result redirect goes back to the diagnostic.
 */
export async function addDiagnosticSpeaking(formData: FormData) {
  const sittingId = String(formData.get('sittingId') ?? '');
  if (!sittingId) throw new Error('Missing sitting');

  const userId = await requireUserId();
  if (!(await isPro(userId))) {
    redirect('/upgrade?from=diagnostic_speaking_wall');
  }

  const sitting = await getMockAttempt(userId, sittingId);
  if (!sitting || sitting.kind !== 'diagnostic' || !sitting.speakingTestId) {
    notFound();
  }

  const existing = await getMockSectionAttempts(userId, sittingId, 'speaking');
  if (existing[0]) redirect(`/speaking/${existing[0].id}`);

  const attempt = await createAttempt({
    userId,
    module: 'speaking',
    kind: 'diagnostic',
    mockAttemptId: sittingId,
    speakingTestId: sitting.speakingTestId,
  });
  redirect(`/speaking/${attempt.id}`);
}
