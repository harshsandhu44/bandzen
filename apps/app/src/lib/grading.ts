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
