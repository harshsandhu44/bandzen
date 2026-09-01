/**
 * Awards. What a candidate has earned by showing up, as a pure function of the
 * evidence we already hold.
 *
 * Two things about this module are load-bearing:
 *
 * The catalogue is code, not rows. An award is a rule, and a rule edited in the
 * CMS would silently rewrite history for everyone who had already met the old
 * one. It stays here so it is reviewed, versioned and tested like `grading.ts`
 * and `study-plan.ts` — and so this file can be run by `node --test` with no
 * database behind it.
 *
 * `awardsEarned` is idempotent. It reads the whole log every time and asks only
 * whether a threshold has *ever* been crossed, so running it again at any later
 * moment returns the same set. That is what lets `awards` rows be written with
 * `onConflictDoNothing` and lets a write that failed heal on the next activity.
 */

export type AwardEvidence = {
  /**
   * Distinct calendar days on which the candidate did something, in their own
   * zone. Order and duplicates do not matter; this module normalises both.
   */
  studyDays: readonly string[];
  lessonsCompleted: number;
  diagnosticsCompleted: number;
};

export type AwardDef = {
  id: string;
  name: string;
  /** The rule in the candidate's words. Shown dimmed until it is earned. */
  requirement: string;
  earned: (evidence: AwardEvidence) => boolean;
};

const DAY_MS = 86_400_000;

/** Whole days from one ISO date to another. Negative when `to` is earlier. */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / DAY_MS);
}

/** Sorted, de-duplicated, with anything unparseable dropped. */
function normalise(days: readonly string[]): string[] {
  return [...new Set(days)]
    .filter((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)))
    .sort();
}

/**
 * The longest run of consecutive study days there has ever been.
 *
 * The streak awards read this rather than the current streak, and that is the
 * decision the whole feature rests on: a run that has ended is still a run that
 * happened. Missing a Tuesday costs momentum, never a possession — which
 * matters for people preparing for an exam on a date they cannot move.
 */
export function longestStreak(studyDays: readonly string[]): number {
  const days = normalise(studyDays);
  if (!days.length) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    run = daysBetween(days[i - 1]!, days[i]!) === 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/**
 * The run still alive today. Display only — no award depends on it.
 *
 * A run ending yesterday counts, because today's study has not happened yet at
 * nine in the morning and a counter that reads zero until then would call a
 * live streak broken every single day.
 */
export function currentStreak(
  studyDays: readonly string[],
  today: string,
): number {
  const days = normalise(studyDays);
  if (!days.length) return 0;

  const last = days[days.length - 1]!;
  const lag = daysBetween(last, today);
  // Ahead of "today" means a clock or zone disagreement, not a streak.
  if (lag < 0 || lag > 1) return 0;

  let run = 1;
  for (let i = days.length - 1; i > 0; i -= 1) {
    if (daysBetween(days[i - 1]!, days[i]!) !== 1) break;
    run += 1;
  }
  return run;
}

/**
 * The launch set. Firsts carry the first session, the streaks carry the first
 * month, and the day counts give someone who studies three times a week a
 * ladder of their own rather than only ever watching the streaks go by.
 *
 * There is no XP and there are no points, because this app does not show
 * numbers it cannot defend from a row.
 */
export const AWARD_CATALOGUE: readonly AwardDef[] = [
  {
    id: 'first-lesson',
    name: 'First technique learned',
    requirement: 'Finish a lesson',
    earned: (e) => e.lessonsCompleted >= 1,
  },
  {
    id: 'first-diagnostic',
    name: 'Measured',
    requirement: 'Complete the diagnostic',
    earned: (e) => e.diagnosticsCompleted >= 1,
  },
  {
    id: 'streak-3',
    name: 'Three days running',
    requirement: 'Study three days in a row',
    earned: (e) => longestStreak(e.studyDays) >= 3,
  },
  {
    id: 'streak-7',
    name: 'A full week',
    requirement: 'Study seven days in a row',
    earned: (e) => longestStreak(e.studyDays) >= 7,
  },
  {
    id: 'streak-14',
    name: 'A fortnight',
    requirement: 'Study fourteen days in a row',
    earned: (e) => longestStreak(e.studyDays) >= 14,
  },
  {
    id: 'streak-30',
    name: 'A month',
    requirement: 'Study thirty days in a row',
    earned: (e) => longestStreak(e.studyDays) >= 30,
  },
  {
    id: 'days-10',
    name: 'Ten study days',
    requirement: 'Study on ten separate days',
    earned: (e) => e.studyDays.length >= 10,
  },
  {
    id: 'days-30',
    name: 'Thirty study days',
    requirement: 'Study on thirty separate days',
    earned: (e) => e.studyDays.length >= 30,
  },
];

export function getAward(id: string): AwardDef | undefined {
  return AWARD_CATALOGUE.find((a) => a.id === id);
}

/** Every award the evidence justifies, in catalogue order. */
export function awardsEarned(evidence: AwardEvidence): string[] {
  return AWARD_CATALOGUE.filter((a) => a.earned(evidence)).map((a) => a.id);
}
