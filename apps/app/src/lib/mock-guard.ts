/**
 * Enforces mock-sitting lockstep against a live attempt. Split out of
 * `mock.ts` because this needs `db` (via `queries.ts`) and Next's `redirect`
 * — see that file's own comment for why those stay out of it.
 */

import { redirect } from 'next/navigation';
import { getMockSiblings } from './db/queries';
import type { Attempt } from './db/schema';
import { mockPosition, mockSectionUrl } from './mock';

/**
 * Guards every mock module `page.tsx`: renders only when `attempt` is the
 * sitting's live section. Anything else — this section was already
 * submitted, or a stale/bookmarked URL points at one out of order — redirects
 * to wherever the sitting actually is instead of rendering. Called after
 * `getAttempt`, guarded by `attempt.kind === 'mock'`; a non-mock attempt has
 * no `mockAttemptId` and this is a no-op for it.
 */
export async function assertMockSection(userId: string, attempt: Attempt) {
  if (!attempt.mockAttemptId) return;

  const siblings = await getMockSiblings(userId, attempt.mockAttemptId);
  const position = mockPosition(siblings);

  if (attempt.status === 'in_progress' && position === attempt.module) return;

  redirect(mockSectionUrl(attempt.mockAttemptId, position));
}
