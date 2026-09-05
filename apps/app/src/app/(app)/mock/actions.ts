'use server';

import { notFound, redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import {
  createAttempt,
  createMockAttempt,
  getMockAttempt,
  getMockSectionAttempts,
  getMockSiblings,
  latestOpenMock,
  mockAllowance,
  mockContentExclusions,
  pickRandomPassages,
  pickRandomPrompt,
  pickRandomSpeakingTest,
  pickRandomTracks,
} from '@/lib/db/queries';
import { mockPosition, mockSectionUrl } from '@/lib/mock';

const PASSAGES_PER_MOCK = 3;
const TRACKS_PER_MOCK = 4;

/**
 * Start (or resume) a full four-skill mock.
 *
 * Resuming is always free, same reasoning as `startWritingAttempt` — the
 * weekly slot was spent when the sitting began, not when it finishes.
 * Content is picked once, here, and locked into the `mockAttempts` row; the
 * five section `attempts` rows are created one at a time as the candidate
 * reaches each one — see `enterMockSection`.
 */
export async function startMock() {
  const userId = await requireUserId();

  const open = await latestOpenMock(userId);
  if (open) {
    const siblings = await getMockSiblings(userId, open.id);
    redirect(mockSectionUrl(open.id, mockPosition(siblings)));
  }

  // The gate, and the only one on this path — same shape as the essay wall.
  //
  // ponytail: check-then-insert, same race the essay wall accepts and for the
  // same reason: Neon is HTTP, so there is no transaction to take, and this
  // only spends one extra sitting on a double-submit, not an unbounded one.
  const cap = await mockAllowance(userId);
  if (!cap.allowed) redirect('/upgrade?from=mock_wall');

  const exclusions = await mockContentExclusions(userId);
  const [passages, tracks, task1, task2, speakingTest] = await Promise.all([
    pickRandomPassages(PASSAGES_PER_MOCK, exclusions.passageIds),
    pickRandomTracks(TRACKS_PER_MOCK, exclusions.trackIds),
    pickRandomPrompt(1, exclusions.promptIds),
    pickRandomPrompt(2, exclusions.promptIds),
    pickRandomSpeakingTest(exclusions.speakingTestIds),
  ]);

  if (passages.length < PASSAGES_PER_MOCK)
    throw new Error(
      `Not enough passages seeded for a mock — need ${PASSAGES_PER_MOCK}`,
    );
  if (tracks.length < TRACKS_PER_MOCK)
    throw new Error(
      `Not enough listening tracks seeded for a mock — need ${TRACKS_PER_MOCK}`,
    );
  if (!task1)
    throw new Error('No Task 1 prompt seeded — see apps/app/README.md');
  if (!task2)
    throw new Error('No Task 2 prompt seeded — see apps/app/README.md');
  if (!speakingTest)
    throw new Error('No speaking test seeded — see apps/app/README.md');

  const mock = await createMockAttempt({
    userId,
    readingPassageIds: passages.map((p) => p.id),
    listeningTrackIds: tracks.map((t) => t.id),
    writingTask1PromptId: task1.id,
    writingTask2PromptId: task2.id,
    speakingTestId: speakingTest.id,
  });

  redirect(`/mock/${mock.id}/next?section=listening`);
}

/**
 * The interstitial's "Continue": creates the current section's attempt
 * row(s) if they don't exist yet, then sends the candidate straight into it.
 * Ignores whatever `?section=` the interstitial was rendered with and
 * recomputes the real position itself — a stale or hand-edited link should
 * land the candidate on the actual current section, not wherever the URL
 * claimed.
 *
 * Reading and Listening create one row with no content pointer of their own
 * (`passageId`/`trackId` stay null); their engines resolve the 3 passages or
 * 4 tracks through `mockAttemptId` instead. Writing creates two rows, one per
 * task, because grading is strictly per-attempt. Idempotent either way: a
 * reload of the interstitial finds the row(s) already there and redirects
 * into them rather than creating duplicates.
 */
export async function enterMockSection(formData: FormData) {
  const mockAttemptId = String(formData.get('mockAttemptId') ?? '');
  if (!mockAttemptId) throw new Error('Missing mock attempt');

  const userId = await requireUserId();
  const mock = await getMockAttempt(userId, mockAttemptId);
  if (!mock) notFound();
  if (mock.submittedAt) redirect(`/mock/${mockAttemptId}/result`);

  const siblings = await getMockSiblings(userId, mockAttemptId);
  const position = mockPosition(siblings);
  if (!position) redirect(`/mock/${mockAttemptId}/result`);

  const existing = await getMockSectionAttempts(
    userId,
    mockAttemptId,
    position,
  );

  if (position === 'writing') {
    const task1 =
      existing.find((r) => r.promptId === mock.writingTask1PromptId) ??
      (await createAttempt({
        userId,
        module: 'writing',
        kind: 'mock',
        promptId: mock.writingTask1PromptId,
        mockAttemptId,
      }));
    if (!existing.some((r) => r.promptId === mock.writingTask2PromptId)) {
      await createAttempt({
        userId,
        module: 'writing',
        kind: 'mock',
        promptId: mock.writingTask2PromptId,
        mockAttemptId,
      });
    }
    redirect(`/writing/${task1.id}`);
  }

  if (existing[0]) redirect(`/${position}/${existing[0].id}`);

  const attempt = await createAttempt({
    userId,
    module: position,
    kind: 'mock',
    mockAttemptId,
    ...(position === 'speaking' ? { speakingTestId: mock.speakingTestId } : {}),
  });
  redirect(`/${position}/${attempt.id}`);
}
