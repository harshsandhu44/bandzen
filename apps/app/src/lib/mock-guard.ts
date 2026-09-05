/**
 * Enforces sitting lockstep against a live attempt, and closes the sitting
 * when its last section submits. Split out of `mock.ts` because this needs
 * `db` (via `queries.ts`) and Next's `redirect` — see that file's own comment
 * for why those stay out of it.
 */

import { redirect } from 'next/navigation';
import {
  getMockAttempt,
  getMockSiblings,
  isPro,
  submitMockAttempt,
} from './db/queries';
import type { Attempt } from './db/schema';
import { mockPosition, mockSectionUrl } from './mock';

/**
 * Whether Speaking is part of this sitting. Always for a mock; for a
 * diagnostic only when the candidate is Pro — a Free diagnostic ends at
 * Writing and never creates a speaking row.
 */
async function speakingInScope(
  userId: string,
  kind: 'mock' | 'diagnostic',
): Promise<boolean> {
  return kind === 'mock' || (await isPro(userId));
}

/**
 * Guards every sitting module `page.tsx`: renders only when `attempt` is the
 * sitting's live section. Anything else — this section was already
 * submitted, or a stale/bookmarked URL points at one out of order — redirects
 * to wherever the sitting actually is instead of rendering. Called after
 * `getAttempt`, guarded by `attempt.mockAttemptId != null`; a non-sitting
 * attempt has no `mockAttemptId` and this is a no-op for it.
 */
export async function assertMockSection(userId: string, attempt: Attempt) {
  if (!attempt.mockAttemptId) return;

  const mock = await getMockAttempt(userId, attempt.mockAttemptId);
  if (!mock) redirect('/');

  const [siblings, includeSpeaking] = await Promise.all([
    getMockSiblings(userId, attempt.mockAttemptId),
    speakingInScope(userId, mock.kind),
  ]);
  const position = mockPosition(siblings, { includeSpeaking });

  if (attempt.status === 'in_progress' && position === attempt.module) return;

  redirect(mockSectionUrl(attempt.mockAttemptId, position, mock.kind));
}

/**
 * Called from every sitting section's submit action after grading. If no
 * section is left to reach, stamp `mock_attempts.submittedAt` (idempotent —
 * `submitMockAttempt` guards on `submittedAt IS NULL`) and send the candidate
 * to the result page; otherwise on to the next interstitial.
 *
 * This is what closes a Free diagnostic at Writing — there is no Speaking
 * section to be the natural terminator, so the sequencer's `null` is.
 */
export async function finishSittingSection(
  userId: string,
  mockAttemptId: string,
): Promise<never> {
  const mock = await getMockAttempt(userId, mockAttemptId);
  if (!mock) redirect('/');

  const [siblings, includeSpeaking] = await Promise.all([
    getMockSiblings(userId, mockAttemptId),
    speakingInScope(userId, mock.kind),
  ]);
  const position = mockPosition(siblings, { includeSpeaking });

  if (!position) await submitMockAttempt(userId, mockAttemptId);

  redirect(mockSectionUrl(mockAttemptId, position, mock.kind));
}
