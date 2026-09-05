/**
 * Reading scoring. Pure functions, no database — these used to be Postgres
 * functions under the Supabase build, and keeping them free of the data layer
 * is what makes them testable now that they are TypeScript.
 */

/**
 * Academic Reading raw score → band, on the public 40-question scale. Shorter
 * sets are scaled up to 40 first, so a 13-question practice set reports on the
 * same scale as a full test.
 *
 * ponytail: General Training converts differently and more generously. Take a
 * format argument when GT ships rather than guessing at it now.
 */
export function readingBand(correct: number, total: number): number {
  if (!total) return 0;
  const scaled = Math.round((correct / total) * 40);
  if (scaled >= 39) return 9;
  if (scaled >= 37) return 8.5;
  if (scaled >= 35) return 8;
  if (scaled >= 33) return 7.5;
  if (scaled >= 30) return 7;
  if (scaled >= 27) return 6.5;
  if (scaled >= 23) return 6;
  if (scaled >= 19) return 5.5;
  if (scaled >= 15) return 5;
  if (scaled >= 13) return 4.5;
  if (scaled >= 10) return 4;
  if (scaled >= 8) return 3.5;
  if (scaled >= 6) return 3;
  return 2.5;
}

const toHalfBand = (n: number) => Math.round(n * 2) / 2;

/** Task 1 and Task 2 combined, Task 2 weighted double — the IELTS convention. */
export function writingSectionBand(task1: number, task2: number): number {
  return toHalfBand((task1 + 2 * task2) / 3);
}

/**
 * The official overall band: the mean of the four skills, rounded
 * asymmetrically rather than to the nearest half. A mean-fraction under .25
 * rounds down, .25-.74 rounds to the half band, .75+ rounds up to the next
 * whole band — e.g. 6.25 -> 6.5, but 6.75 -> 7.0.
 */
export function overallBand(
  bands: readonly [number, number, number, number],
): number {
  const mean = bands.reduce((a, b) => a + b, 0) / 4;
  const frac = mean - Math.floor(mean);
  if (frac < 0.25) return Math.floor(mean);
  if (frac < 0.75) return Math.floor(mean) + 0.5;
  return Math.ceil(mean);
}

const normalise = (s: string) => s.trim().toLowerCase();

/**
 * A key holds every accepted form, so "cotton" and "raw cotton" can both be
 * right. Comparison ignores case and surrounding whitespace, because a
 * candidate typing "  TRUE " has not made a mistake.
 */
export function isAnswerCorrect(
  key: string[],
  given: string | null | undefined,
): boolean {
  if (!given?.trim()) return false;
  return key.some((accepted) => normalise(accepted) === normalise(given));
}
