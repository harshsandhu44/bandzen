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

/** Real IELTS order. Listening first, Speaking last. */
export const MOCK_ORDER: readonly Skill[] = [
  'listening',
  'reading',
  'writing',
  'speaking',
];

export type MockChild = { module: Skill; status: string };

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
 */
export function mockPosition(children: readonly MockChild[]): Skill | null {
  for (const skill of MOCK_ORDER) {
    const rows = children.filter((c) => c.module === skill);
    if (rows.length === 0) return skill;
    if (rows.some((r) => r.status === 'in_progress')) return skill;
  }
  return null;
}

/**
 * Which of the mock's Listening tracks should be playing at `elapsedSeconds`
 * since the section started, derived rather than stored — the same
 * wall-clock-anchoring `Timer` already uses for Reading/Writing, extended to
 * a sequence of clips instead of one countdown. `inPause` covers the review
 * gap between tracks, where nothing should be playing yet.
 */
export function trackIndexAtElapsed(
  elapsedSeconds: number,
  trackDurations: readonly number[],
  pauseSeconds: number,
): { index: number; offsetSeconds: number; inPause: boolean; done: boolean } {
  let t = Math.max(0, elapsedSeconds);
  for (let i = 0; i < trackDurations.length; i += 1) {
    if (t < trackDurations[i]) {
      return { index: i, offsetSeconds: t, inPause: false, done: false };
    }
    t -= trackDurations[i];
    if (i < trackDurations.length - 1) {
      if (t < pauseSeconds) {
        return { index: i + 1, offsetSeconds: 0, inPause: true, done: false };
      }
      t -= pauseSeconds;
    }
  }
  return {
    index: Math.max(0, trackDurations.length - 1),
    offsetSeconds: 0,
    inPause: false,
    done: true,
  };
}

/** The Listening section's total wall-clock length — every track plus the pause between each. */
export function listeningSectionSeconds(
  trackDurations: readonly number[],
  pauseSeconds: number,
): number {
  const tracks = trackDurations.reduce((a, b) => a + b, 0);
  return tracks + Math.max(0, trackDurations.length - 1) * pauseSeconds;
}

/** `/mock/[id]/next?section=...` or `/mock/[id]/result` — wherever `position` says the sitting actually is. */
export function mockSectionUrl(mockAttemptId: string, position: Skill | null) {
  return position
    ? `/mock/${mockAttemptId}/next?section=${position}`
    : `/mock/${mockAttemptId}/result`;
}
