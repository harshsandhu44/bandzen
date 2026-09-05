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
  | { kind: 'listening'; trackId: string }
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
  /**
   * Writing prompts with the task each one is for. The task matters because a
   * drill names it ("Task 1 summary"), so a plan that knows only ids can
   * schedule an exercise nothing in the library can satisfy.
   */
  prompts?: readonly { id: string; task: number }[];
  trackIds?: readonly string[];
  /** Lesson slug that teaches a question kind, from src/content/lessons.ts. */
  lessonForKind?: Readonly<Record<string, string>>;
  completedLessonIds?: readonly string[];
};

export type PlanInput = {
  readingBand: number | null;
  writingBand: number | null;
  /** Null until the diagnostic (or a listening practice attempt) measures it. */
  listeningBand?: number | null;
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

const LISTENING_DRILLS = [
  { label: 'One section, note completion under timing', minutes: 15 },
  { label: 'Matching and multiple choice, one section', minutes: 15 },
  { label: 'Full track, played once', minutes: 30 },
  { label: 'Section 3 and 4 back to back', minutes: 20 },
];

const WRITING_DRILLS = [
  { label: 'Task 2 essay, full timing', minutes: 40, task: 2 },
  { label: 'Task 2 introduction and thesis only', minutes: 15, task: 2 },
  {
    label: 'Paragraph development from a weak body paragraph',
    minutes: 25,
    task: 2,
  },
  { label: 'Task 1 summary, full timing', minutes: 20, task: 1 },
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

/** The skills the plan schedules — Speaking is Pro-only and never drilled here. */
const PLANNABLE: readonly Skill[] = ['listening', 'reading', 'writing'];

function bandOf(input: PlanInput, skill: Skill): number | null {
  if (skill === 'reading') return input.readingBand;
  if (skill === 'writing') return input.writingBand;
  if (skill === 'listening') return input.listeningBand ?? null;
  return null;
}

/** Plannable skills that have actually been measured. */
function measuredSkills(input: PlanInput): Skill[] {
  return PLANNABLE.filter((s) => bandOf(input, s) != null);
}

/**
 * The one skill holding the band back: the weakest measured skill, but only
 * when it is a real band clear of the next-worst — a 0.5 difference is inside
 * the noise of an estimate and does not justify skewing a fortnight of study.
 * Null when nothing is measured, only one skill is, or the field is even.
 */
export function weakestSkill(input: PlanInput): Skill | null {
  const scored = measuredSkills(input)
    .map((skill) => ({ skill, band: bandOf(input, skill)! }))
    .sort((a, b) => a.band - b.band);
  if (scored.length < 2) return null;
  return scored[1]!.band - scored[0]!.band >= 1 ? scored[0]!.skill : null;
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

  const weakest = weakestSkill(input);
  const measured = measuredSkills(input);
  // The skills the rotation cycles, in a stable order. Falls back to the
  // original reading/writing pair when nothing has been measured yet.
  const rotation: Skill[] = measured.length
    ? measured
    : ['reading', 'writing'];
  const others = weakest ? rotation.filter((s) => s !== weakest) : [];
  const tasks: PlanTask[] = [];

  // A drill may only be scheduled if a prompt exists for the task it names.
  // Content is seeded Task 2 first, so without this the plan booked "Task 1
  // summary, full timing" against a library of Task 2 prompts: the label
  // promised one exercise and Continue opened another. An absent catalogue
  // keeps every drill, so a plan built without one is unchanged.
  const prompts = input.catalogue?.prompts;
  const available = prompts?.length
    ? WRITING_DRILLS.filter((d) => prompts.some((p) => p.task === d.task))
    : WRITING_DRILLS;
  const writingDrills = available.length ? available : WRITING_DRILLS;

  let readingCursor = 0;
  let writingCursor = 0;
  let listeningCursor = 0;
  let otherCursor = 0;

  // Spent on the first reading day only; after that the drills take over.
  let pendingLesson = lessonFirst(input);

  for (let day = 1; day <= horizon; day += 1) {
    // With a clear gap the weakest skill takes two days in three, the third
    // cycling through the rest; otherwise an even rotation.
    let skill: Skill;
    if (weakest && others.length) {
      skill =
        day % 3 === 0 ? others[otherCursor++ % others.length]! : weakest;
    } else if (weakest) {
      skill = weakest;
    } else {
      skill = rotation[(day - 1) % rotation.length]!;
    }

    // Day 1 is today, not tomorrow. A plan whose first task lands tomorrow
    // leaves the dashboard with nothing to put under "Today".
    const date = new Date(today.getTime() + (day - 1) * DAY_MS);

    // The first reading slot teaches the weakest question kind rather than
    // drilling it, when there is a lesson for it the candidate has not read.
    if (skill === 'reading' && pendingLesson) {
      const lesson = pendingLesson;
      pendingLesson = null;
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

    let drill: { label: string; minutes: number };
    let target: PlanTarget | null = null;

    if (skill === 'writing') {
      const wd = writingDrills[writingCursor++ % writingDrills.length]!;
      drill = wd;
      // Rotate within the drill's own task, so the prompt that opens is the
      // kind of exercise the label just promised.
      const forTask = prompts?.filter((p) => p.task === wd.task);
      const prompt = pick(forTask, writingCursor - 1);
      if (prompt) target = { kind: 'writing', promptId: prompt.id };
    } else if (skill === 'listening') {
      drill = LISTENING_DRILLS[listeningCursor++ % LISTENING_DRILLS.length]!;
      const trackId = pick(input.catalogue?.trackIds, listeningCursor - 1);
      if (trackId) target = { kind: 'listening', trackId };
    } else {
      drill = READING_DRILLS[readingCursor++ % READING_DRILLS.length]!;
      const passageId = pick(input.catalogue?.passageIds, readingCursor - 1);
      if (passageId) target = { kind: 'reading', passageId };
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
const SKILL_LABEL: Record<Skill, string> = {
  reading: 'Reading',
  writing: 'Writing',
  listening: 'Listening',
  speaking: 'Speaking',
};

export function nextAction(input: PlanInput): string {
  const measured = measuredSkills(input);
  if (!measured.length) {
    return 'Take the diagnostic to get your first estimate.';
  }
  const weakest = weakestSkill(input);
  if (weakest)
    return `${SKILL_LABEL[weakest]} is holding your band back.`;
  if (input.targetBand != null) {
    const best = Math.max(...measured.map((s) => bandOf(input, s)!));
    if (best >= input.targetBand)
      return 'You are at your target band in practice. Keep it warm.';
  }
  return 'Your skills are close. Keep the rotation even.';
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
    case 'listening':
      return `/listening?track=${task.target.trackId}`;
    case 'lesson':
      // Lesson routes are module-scoped, and the task's skill is that module.
      return `/learn/${task.skill}/${task.target.lessonId}`;
    default:
      return null;
  }
}
