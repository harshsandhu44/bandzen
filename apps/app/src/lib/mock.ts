/**
 * The full four-skill mock sitting: where a candidate is in it, and how the
 * audio-paced Listening section maps wall-clock time onto a track.
 *
 * Pure, no database, no framework imports — same reason as `grading.ts` and
 * `entitlements.ts` — so `pnpm test` covers it without a fixture. The one
 * function that actually enforces this against a live attempt,
 * `assertMockSection`, lives in `mock-guard.ts` instead, since it needs `db`
 * (via `queries.ts`) and Next's `redirect`, neither of which this module
 * should have to pull in just to test `mockPosition`.
 */

import type { Skill } from './db/schema';

/** Which kind of sitting a `mock_attempts` row is. Mirrors the `sitting_kind` enum. */
export type SittingKind = 'mock' | 'diagnostic';

/** Real IELTS order. Listening first, Speaking last. */
export const MOCK_ORDER: readonly Skill[] = [
  'listening',
  'reading',
  'writing',
  'speaking',
];

export type MockChild = { module: Skill; status: string };

/** A diagnostic sits 2 passages / 2 tracks — half a mock. Mock counts live in `mock/actions.ts`. */
export const DIAGNOSTIC_PASSAGES = 2;
export const DIAGNOSTIC_TRACKS = 2;

/**
 * Which section the sitting is on, from whatever child attempt rows exist so
 * far — `null` once every section has at least one row and none of them are
 * still `in_progress` (submitted or auto-submitted counts as done; the
 * essays/speaking grader running in the background does not hold this up).
 *
 * A module with zero rows reads the same as one still `in_progress`: not
 * reached yet, and not created until the candidate enters it (see
 * `enterMockSection`) — the reason the whole sitting isn't five rows
 * inserted up front is that every section's `Timer` anchors on its own
 * `attempts.startedAt`.
 *
 * Every sitting — mock and diagnostic alike — runs all four skills; the
 * diagnostic is only shorter in content, not in scope.
 */
export function mockPosition(children: readonly MockChild[]): Skill | null {
  for (const skill of MOCK_ORDER) {
    const rows = children.filter((c) => c.module === skill);
    if (rows.length === 0) return skill;
    if (rows.some((r) => r.status === 'in_progress')) return skill;
  }
  return null;
}

/** The Listening section's total wall-clock length — every track plus the pause between each. */
export function listeningSectionSeconds(
  trackDurations: readonly number[],
  pauseSeconds: number,
): number {
  const tracks = trackDurations.reduce((a, b) => a + b, 0);
  return tracks + Math.max(0, trackDurations.length - 1) * pauseSeconds;
}

/**
 * `<prefix>/[id]/next?section=...` or `<prefix>/[id]/result` — wherever
 * `position` says the sitting actually is. The prefix is `/diagnostic` for a
 * diagnostic sitting and `/mock` for a mock; the engine URLs the interstitial
 * hands off to (`/reading/[id]` etc.) are shared and unaffected.
 */
export function mockSectionUrl(
  mockAttemptId: string,
  position: Skill | null,
  kind: SittingKind = 'mock',
) {
  const prefix = kind === 'diagnostic' ? '/diagnostic' : '/mock';
  return position
    ? `${prefix}/${mockAttemptId}/next?section=${position}`
    : `${prefix}/${mockAttemptId}/result`;
}
