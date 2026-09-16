import type { ScoreScale } from './types.ts';

/**
 * Putting a number on an exam's own scale.
 *
 * Its own module so every adapter can use it without importing `scoring.ts`,
 * which re-exports the adapters in turn — that would be an import cycle, and
 * the alternative was each adapter copying three lines of arithmetic.
 */

/** Onto the scale: clamped to its range and snapped to its step. */
export function roundToScale(scale: ScoreScale, n: number): number {
  const stepped =
    scale.min + Math.round((n - scale.min) / scale.step) * scale.step;
  return Math.min(scale.max, Math.max(scale.min, stepped));
}

/** Half-step scales show one decimal (7.0); whole-step scales show none (79). */
export function formatScore(scale: ScoreScale, n: number): string {
  return n.toFixed(Number.isInteger(scale.step) ? 0 : 1);
}
