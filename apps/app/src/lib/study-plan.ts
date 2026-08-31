import type { Skill } from '@/lib/db/schema';

/**
 * The study plan. A deterministic rule engine, not a model call — it is a
 * weighted rotation over the candidate's weakest areas, which costs nothing
 * per user and is the same answer every time for the same inputs.
 */

/**
 * What a task actually opens. Without this a plan is a list of advice; with it
 * the dashboard's Continue button has somewhere to go.
 */
export type PlanTarget =
  | { kind: 'reading'; passageId: string }
  | { kind: 'writing'; promptId: string }
  | { kind: 'lesson'; lessonId: string };

export type PlanTask = {
  day: number;
  date: string;
  skill: Skill;
  label: string;
  minutes: number;
  /** Null when nothing in the catalogue can satisfy this task. */
  target: PlanTarget | null;
};

/**
 * What the plan is allowed to point at. Passed in rather than queried so this
 * module stays pure and the engine stays testable without a database.
 */
export type PlanCatalogue = {
  passageIds?: readonly string[];
  promptIds?: readonly string[];
  /** Lesson slug that teaches a question kind, from src/content/lessons.ts. */
  lessonForKind?: Readonly<Record<string, string>>;
  completedLessonIds?: readonly string[];
};

export type PlanInput = {
  readingBand: number | null;
  writingBand: number | null;
  targetBand: number | null;
  /** ISO date. Null means no exam booked; the plan then runs a fortnight. */
  testDate: string | null;
  /** Weakness phrases from the most recent writing report, most severe first. */
  weaknesses?: string[];
  /** Reading question kinds with the worst accuracy, worst first. */
  weakKinds?: readonly string[];
  catalogue?: PlanCatalogue;
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

/**
 * Rotate through what is available so two consecutive reading days do not hand
 * back the same passage. An empty catalogue yields null, and the task renders
 * without a Continue button rather than with one that goes nowhere.
 */
function pick<T>(items: readonly T[] | undefined, cursor: number): T | null {
  if (!items?.length) return null;
  return items[cursor % items.length]!;
}

/**
 * The lesson a candidate should read before drilling their weakest question
 * kind, if there is one and they have not read it. This is the LEARN → PRACTICE
 * half of the loop: sending someone to drill a technique nobody has taught them
 * yet produces a worse score and no understanding of why.
 */
function lessonFirst(input: PlanInput): PlanTarget | null {
  const { lessonForKind, completedLessonIds } = input.catalogue ?? {};
  if (!lessonForKind) return null;

  for (const kind of input.weakKinds ?? []) {
    const lessonId = lessonForKind[kind];
    if (lessonId && !completedLessonIds?.includes(lessonId)) {
      return { kind: 'lesson', lessonId };
    }
  }
  return null;
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

  // Spent on the first reading day only; after that the drills take over.
  let pendingLesson = lessonFirst(input);

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

    // Day 1 is today, not tomorrow. A plan whose first task lands tomorrow
    // leaves the dashboard with nothing to put under "Today".
    const date = new Date(today.getTime() + (day - 1) * DAY_MS);

    // The first reading slot teaches the weakest question kind rather than
    // drilling it, when there is a lesson for it the candidate has not read.
    if (skill === 'reading' && pendingLesson) {
      const lesson = pendingLesson;
      pendingLesson = null;
      readingCursor -= 1; // The drill was not spent; keep the rotation intact.
      tasks.push({
        day,
        date: iso(date),
        skill,
        label: 'Learn the technique before drilling it',
        minutes: 15,
        target: lesson,
      });
      continue;
    }

    // Both cursors were post-incremented above, so -1 is this task's slot.
    let target: PlanTarget | null = null;
    if (skill === 'reading') {
      const passageId = pick(input.catalogue?.passageIds, readingCursor - 1);
      if (passageId) target = { kind: 'reading', passageId };
    } else {
      const promptId = pick(input.catalogue?.promptIds, writingCursor - 1);
      if (promptId) target = { kind: 'writing', promptId };
    }

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
      target,
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

// ---------------------------------------------------------------------------
// Task state — derived, never stored
// ---------------------------------------------------------------------------

export type StudyTaskStatus = 'pending' | 'active' | 'completed';

export type PlanTaskState = PlanTask & { status: StudyTaskStatus };

export type PlanProgress = {
  tasks: PlanTaskState[];
  minutesDone: number;
  minutesGoal: number;
};

/**
 * What the candidate has actually done, expressed as the evidence we hold
 * rather than as a stored task status. A plan row and an attempt row cannot
 * contradict each other if there is only ever one of them.
 */
export type PlanEvidence = {
  /** One entry per completed attempt submitted today. */
  modulesCompletedToday: readonly Skill[];
  completedLessonIds: readonly string[];
  /** The module of an attempt left open, if any. */
  moduleInProgress?: Skill | null;
};

/**
 * Label today's tasks against that evidence.
 *
 * A skill's Nth task today completes on its Nth attempt today, so two reading
 * tasks need two reading attempts rather than both lighting up from one.
 */
export function derivePlanState(
  tasks: PlanTask[],
  evidence: PlanEvidence,
  goalMinutes?: number | null,
): PlanProgress {
  const remaining = new Map<Skill, number>();
  for (const skill of evidence.modulesCompletedToday) {
    remaining.set(skill, (remaining.get(skill) ?? 0) + 1);
  }

  let activeTaken = false;

  const stated = tasks.map((task): PlanTaskState => {
    if (task.target?.kind === 'lesson') {
      const done = evidence.completedLessonIds.includes(task.target.lessonId);
      return { ...task, status: done ? 'completed' : 'pending' };
    }

    const left = remaining.get(task.skill) ?? 0;
    if (left > 0) {
      remaining.set(task.skill, left - 1);
      return { ...task, status: 'completed' };
    }

    // Only one task is ever active: the first unfinished one, and only when a
    // matching attempt is genuinely open.
    if (!activeTaken && evidence.moduleInProgress === task.skill) {
      activeTaken = true;
      return { ...task, status: 'active' };
    }
    return { ...task, status: 'pending' };
  });

  const minutesDone = stated
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + t.minutes, 0);

  return {
    tasks: stated,
    minutesDone,
    // Falls back to what the plan itself asks for, so the bar always has a
    // denominator even before onboarding records a daily target.
    minutesGoal: goalMinutes ?? stated.reduce((sum, t) => sum + t.minutes, 0),
  };
}

/** The tasks scheduled for one calendar day. */
export function tasksOn(tasks: PlanTask[], isoDate: string) {
  return tasks.filter((t) => t.date === isoDate);
}

/**
 * Where a task actually opens. Null means we have nothing real to link to --
 * a task whose material is not seeded yet must not render a dead link.
 */
export function targetHref(task: PlanTask): string | null {
  switch (task.target?.kind) {
    case 'reading':
      return `/reading?passage=${task.target.passageId}`;
    case 'writing':
      return `/writing?prompt=${task.target.promptId}`;
    case 'lesson':
      // Lesson routes are module-scoped, and the task's skill is that module.
      return `/learn/${task.skill}/${task.target.lessonId}`;
    default:
      return null;
  }
}
