/**
 * Every number the documentation asserts about how the product behaves.
 *
 * They live here, in one file, rather than inline in the prose that uses them.
 * A quota is not a sentence — it is a value that appears in four pages, and
 * changing it should be one edit rather than a grep.
 *
 * These are copies. `apps/app` owns the originals and this app cannot import
 * them: apps are not packages, and promoting `entitlements.ts` into
 * `packages/db` to serve a docs site would be the tail wagging the dog.
 * `facts.test.ts` reads the real source as text and fails if a value here has
 * drifted from it, which is the same trick `apps/admin`'s `schemas.test.ts`
 * uses against `apps/app/content/`.
 *
 * Prices are deliberately absent, and should stay absent. The root README is
 * explicit that they change without a commit, so a price written here would be
 * wrong before anyone noticed. Link to the pricing section on the marketing
 * site instead — it is already the source.
 */

/** What a candidate gets without paying. Sources: `apps/app/src/lib/entitlements.ts`. */
export const FREE = {
  /** Marked essays per rolling window. */
  essays: 2,
  /** Coach messages per rolling window. */
  coach: 10,
  /** The window is rolling, not calendar, so the reset can be stated exactly. */
  windowDays: 7,
  /** Diagnostics, ever. Retaking is Pro. */
  diagnostics: 1,
  /** How far the band trend on Progress goes back. Source: `progress/page.tsx`. */
  trendPoints: 5,
} as const;

/** The reverse trial, granted when onboarding completes — not at sign-up. */
export const TRIAL_DAYS = 7;

/** Refund window. Source: `apps/web/src/content/sections.ts` (`legal.refundDays`). */
export const REFUND_DAYS = 7;

/**
 * Questions of one kind a candidate must have attempted before their accuracy
 * on it is treated as signal rather than a bad day. Source: `insight.ts`.
 */
export const MIN_ATTEMPTED = 5;

/** The furthest the study plan ever looks ahead. Source: `study-plan.ts`. */
export const PLAN_HORIZON_DAYS = 14;

/** Turns Coach carries before it stops. Source: `ai/coach.ts`. */
export const COACH_MAX_TURNS = 20;

/**
 * Academic Reading raw score (scaled to 40) → band.
 * Source: `readingBand()` in `apps/app/src/lib/grading.ts`.
 */
export const READING_BANDS = [
  { from: 39, band: '9.0' },
  { from: 37, band: '8.5' },
  { from: 35, band: '8.0' },
  { from: 33, band: '7.5' },
  { from: 30, band: '7.0' },
  { from: 27, band: '6.5' },
  { from: 23, band: '6.0' },
  { from: 19, band: '5.5' },
  { from: 15, band: '5.0' },
  { from: 13, band: '4.5' },
  { from: 10, band: '4.0' },
  { from: 8, band: '3.5' },
  { from: 6, band: '3.0' },
  { from: 0, band: '2.5' },
] as const;

/**
 * The award catalogue, verbatim. Source: `apps/app/src/lib/awards.ts`.
 *
 * The requirement strings are the ones the product itself shows on the award
 * wall. Rewording them here would mean a candidate reading two descriptions of
 * one rule.
 */
export const AWARDS = [
  {
    id: 'first-lesson',
    name: 'First technique learned',
    requirement: 'Finish a lesson',
  },
  {
    id: 'first-diagnostic',
    name: 'Measured',
    requirement: 'Complete the diagnostic',
  },
  {
    id: 'streak-3',
    name: 'Three days running',
    requirement: 'Study three days in a row',
  },
  {
    id: 'streak-7',
    name: 'A full week',
    requirement: 'Study seven days in a row',
  },
  {
    id: 'streak-14',
    name: 'A fortnight',
    requirement: 'Study fourteen days in a row',
  },
  {
    id: 'streak-30',
    name: 'A month',
    requirement: 'Study thirty days in a row',
  },
  {
    id: 'days-10',
    name: 'Ten study days',
    requirement: 'Study on ten separate days',
  },
  {
    id: 'days-30',
    name: 'Thirty study days',
    requirement: 'Study on thirty separate days',
  },
] as const;

/** The four IELTS Writing criteria. Source: `apps/app/src/lib/ai/schemas.ts`. */
export const WRITING_CRITERIA = [
  'Task Response',
  'Coherence and Cohesion',
  'Lexical Resource',
  'Grammatical Range and Accuracy',
] as const;

/** Where the prices actually live. */
export const PRICING_URL = 'https://bandzen.com/#pricing';
