import type { Skill } from '@/lib/db/schema';

/**
 * The study plan. A deterministic rule engine, not a model call — it is a
 * weighted rotation over the candidate's weakest areas, which costs nothing
 * per user and is the same answer every time for the same inputs.
 */

export type PlanTask = {
  day: number;
  date: string;
  skill: Skill;
  label: string;
  minutes: number;
};

export type PlanInput = {
  readingBand: number | null;
  writingBand: number | null;
  targetBand: number | null;
  /** ISO date. Null means no exam booked; the plan then runs a fortnight. */
  testDate: string | null;
  /** Weakness phrases from the most recent writing report, most severe first. */
  weaknesses?: string[];
  /** Injected so the output is testable. */
  today?: Date;
};

const READING_DRILLS = [
  { label: 'True / False / Not Given drill', minutes: 25 },
  { label: 'Matching headings drill', minutes: 25 },
  { label: 'Sentence completion under timing', minutes: 20 },
  { label: 'Full passage, timed', minutes: 40 },
];

const WRITING_DRILLS = [
  { label: 'Task 2 essay, full timing', minutes: 40 },
  { label: 'Task 2 introduction and thesis only', minutes: 15 },
  { label: 'Paragraph development from a weak body paragraph', minutes: 25 },
  { label: 'Task 1 summary, full timing', minutes: 20 },
];

const MAX_DAYS = 14;
const DAY_MS = 86_400_000;

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Whole days from `from` to `to`, floored at 0. */
function daysUntil(from: Date, to: string): number {
  const target = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(target)) return 0;
  const start = Date.parse(`${iso(from)}T00:00:00Z`);
  return Math.max(0, Math.round((target - start) / DAY_MS));
}

/**
 * How many of every three days go to the weaker skill. Two when there is a
 * real gap, otherwise an even split — a 0.5 band difference is inside the
 * noise of an estimate and does not justify skewing a fortnight of study.
 */
function weakerShare(reading: number | null, writing: number | null) {
  if (reading == null || writing == null) return null;
  const gap = reading - writing;
  if (Math.abs(gap) < 1) return null;
  return gap > 0 ? ('writing' as const) : ('reading' as const);
}

export function buildPlan(input: PlanInput): PlanTask[] {
  const today = input.today ?? new Date();

  const horizon = input.testDate
    ? Math.min(MAX_DAYS, daysUntil(today, input.testDate))
    : MAX_DAYS;

  if (horizon <= 0) return [];

  const weaker = weakerShare(input.readingBand, input.writingBand);
  const tasks: PlanTask[] = [];

  let readingCursor = 0;
  let writingCursor = 0;

  for (let day = 1; day <= horizon; day += 1) {
    // With a clear gap the weaker skill takes two days in three; otherwise
    // the two alternate.
    const slot = day % 3;
    const skill: Skill =
      weaker === null
        ? day % 2 === 1
          ? 'reading'
          : 'writing'
        : slot === 0
          ? weaker === 'writing'
            ? 'reading'
            : 'writing'
          : weaker;

    const drill =
      skill === 'reading'
        ? READING_DRILLS[readingCursor++ % READING_DRILLS.length]!
        : WRITING_DRILLS[writingCursor++ % WRITING_DRILLS.length]!;

    const date = new Date(today.getTime() + day * DAY_MS);

    tasks.push({
      day,
      date: iso(date),
      skill,
      // The first writing task names the actual weakness the grader found,
      // so the plan reads as a response to the report rather than a template.
      label:
        skill === 'writing' && writingCursor === 1 && input.weaknesses?.length
          ? `${drill.label} — focus: ${input.weaknesses[0]}`
          : drill.label,
      minutes: drill.minutes,
    });
  }

  return tasks;
}

/** The single line the dashboard leads with. */
export function nextAction(input: PlanInput): string {
  if (input.readingBand == null && input.writingBand == null) {
    return 'Take the diagnostic to get your first estimate.';
  }
  const weaker = weakerShare(input.readingBand, input.writingBand);
  if (weaker)
    return `${weaker === 'reading' ? 'Reading' : 'Writing'} is holding your band back.`;
  if (input.targetBand != null) {
    const best = Math.max(input.readingBand ?? 0, input.writingBand ?? 0);
    if (best >= input.targetBand)
      return 'You are at your target band in practice. Keep it warm.';
  }
  return 'Both skills are close. Keep the rotation even.';
}
