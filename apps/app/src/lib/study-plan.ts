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
  | { kind: 'lesson'; lessonId: string }
  /** An exam whose content is task items rather than passages and prompts. */
  | { kind: 'exam_task'; taskType: string };

export type PlanTask = {
  day: number;
  date: string;
  skill: Skill;
  label: string;
  minutes: number;
  /** Null when nothing in the catalogue can satisfy this task. */
  target: PlanTarget | null;
  /** Where the task opens, resolved by the exam's strategy. Null with no target. */
  href: string | null;
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
  /** Task types with at least one published item, for exams built from them. */
  examTaskTypes?: readonly string[];
  /** Lesson slug that teaches a question kind, from src/content/lessons.ts. */
  lessonForKind?: Readonly<Record<string, string>>;
  completedLessonIds?: readonly string[];
  /**
   * Of those, the ones finished today. They keep their slot so Today shows
   * them done rather than dropping them the moment they are finished.
   */
  lessonsCompletedToday?: readonly string[];
};

/**
 * One schedulable exercise. `task` narrows it to IELTS content of that subtype;
 * `taskType` names the exam task a drill opens where the exam's content is
 * task items.
 */
export type Drill = {
  label: string;
  minutes: number;
  task?: number;
  taskType?: string;
};

/**
 * Everything exam-specific about planning, supplied per exam (see
 * `plan-strategies.ts`). The engine below knows rotation, horizons and weakest
 * skills; it knows nothing about IELTS, its drills, its routes or its scale.
 */
export type PlanStrategy = {
  /** The skills the plan may schedule, in rotation order. */
  plannable: readonly Skill[];
  /** The rotation before any skill has been measured. */
  startingRotation: readonly Skill[];
  /** How far apart two scores must be before one skill is holding the rest back. */
  meaningfulGap: number;
  /** What this exam calls a score, for the dashboard's one line. */
  scoreNoun: string;
  /** What to tell a candidate with nothing measured yet. */
  noEstimateAction: string;
  drills: Partial<Record<Skill, readonly Drill[]>>;
  /** Whether the catalogue can satisfy this drill at all. */
  canSchedule(
    skill: Skill,
    drill: Drill,
    catalogue: PlanCatalogue | undefined,
  ): boolean;
  /** The content a drill opens the nth time it comes round, or null. */
  targetFor(
    skill: Skill,
    drill: Drill,
    catalogue: PlanCatalogue | undefined,
    nth: number,
  ): PlanTarget | null;
  /** The skill whose first slot teaches the weakest question kind, if any. */
  lessonSkill: Skill | null;
  /** The skill whose first task names the latest graded weakness, if any. */
  feedbackSkill: Skill | null;
  href(skill: Skill, target: PlanTarget): string;
};

export type PlanInput = {
  strategy: PlanStrategy;
  /** The latest measured score per skill, on the exam's own scale. */
  scores: Partial<Record<Skill, number | null>>;
  targetScore: number | null;
  /** ISO date. Null means no exam booked; the plan then runs a fortnight. */
  testDate: string | null;
  /** Weakness phrases from the most recent graded report, most severe first. */
  weaknesses?: string[];
  /** Question kinds with the worst accuracy, worst first. */
  weakKinds?: readonly string[];
  catalogue?: PlanCatalogue;
  /**
   * The candidate's own calendar date (ISO), from `todayIso(profile.timezone)`.
   * Required: a server clock is UTC, and a plan anchored on it lands on the
   * wrong day for anyone whose local date differs.
   */
  today: string;
};

const MAX_DAYS = 14;
const DAY_MS = 86_400_000;

/** Calendar arithmetic on ISO dates, done in UTC so no offset can shift a day. */
const addDays = (isoDate: string, days: number) =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

/** Whole days from `from` to `to`, floored at 0. */
function daysUntil(from: string, to: string): number {
  const target = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(target)) return 0;
  const start = Date.parse(`${from}T00:00:00Z`);
  return Math.max(0, Math.round((target - start) / DAY_MS));
}

/**
 * Where the booked test sits relative to today: its day, already behind the
 * candidate, or ahead (null, including when none is booked). An empty plan
 * on exam day or after it should say why.
 */
export function testDayState(
  today: string,
  testDate: string | null,
): 'exam_day' | 'passed' | null {
  if (!testDate) return null;
  if (testDate === today) return 'exam_day';
  return testDate < today ? 'passed' : null;
}

const scoreOf = (input: PlanInput, skill: Skill) => input.scores[skill] ?? null;

/** Plannable skills that have actually been measured. */
function measuredSkills(input: PlanInput): Skill[] {
  return input.strategy.plannable.filter((s) => scoreOf(input, s) != null);
}

/**
 * The one skill holding the score back: the weakest measured skill, but only
 * when it is clear of the next-worst by the exam's meaningful gap — a smaller
 * difference is inside the noise of an estimate and does not justify skewing a
 * fortnight of study. Null when nothing is measured, only one skill is, or the
 * field is even.
 */
export function weakestSkill(input: PlanInput): Skill | null {
  const scored = measuredSkills(input)
    .map((skill) => ({ skill, score: scoreOf(input, skill)! }))
    .sort((a, b) => a.score - b.score);
  if (scored.length < 2) return null;
  return scored[1]!.score - scored[0]!.score >= input.strategy.meaningfulGap
    ? scored[0]!.skill
    : null;
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

  const doneToday = input.catalogue?.lessonsCompletedToday ?? [];
  for (const kind of input.weakKinds ?? []) {
    const lessonId = lessonForKind[kind];
    if (
      lessonId &&
      (!completedLessonIds?.includes(lessonId) || doneToday.includes(lessonId))
    ) {
      return { kind: 'lesson', lessonId };
    }
  }
  return null;
}

export function buildPlan(input: PlanInput): PlanTask[] {
  const { strategy, catalogue, today } = input;

  const horizon = input.testDate
    ? Math.min(MAX_DAYS, daysUntil(today, input.testDate))
    : MAX_DAYS;

  if (horizon <= 0) return [];

  // A drill may only be scheduled if the catalogue can satisfy it: the plan
  // once booked "Task 1 summary, full timing" against a library of Task 2
  // prompts, so the label promised one exercise and Continue opened another.
  // A skill with nothing schedulable drops out of the rotation instead of
  // spending a day on a task with nothing behind it.
  const drillsFor = (skill: Skill) =>
    (strategy.drills[skill] ?? []).filter(
      (d) =>
        strategy.canSchedule(skill, d, catalogue) &&
        strategy.targetFor(skill, d, catalogue, 0) != null,
    );
  const schedulable = (skills: readonly Skill[]) =>
    skills.filter((s) => drillsFor(s).length > 0);

  const weakest = weakestSkill(input);
  const measured = measuredSkills(input);
  // Before anything is measured, the exam's opening rotation. After, every
  // plannable skill: one measured score must not drop the unmeasured ones,
  // which still need a baseline.
  const rotation = schedulable(
    measured.length ? strategy.plannable : strategy.startingRotation,
  );
  const lead = weakest && rotation.includes(weakest) ? weakest : null;
  const others = lead ? rotation.filter((s) => s !== lead) : [];
  const tasks: PlanTask[] = [];
  if (!rotation.length) return tasks;

  const cursors = new Map<Skill, number>();
  let otherCursor = 0;

  // Spent on the lesson skill's first slot only; after that the drills take over.
  let pendingLesson = lessonFirst(input);

  for (let day = 1; day <= horizon; day += 1) {
    // With a clear gap the weakest skill takes two days in three, the third
    // cycling through the rest; otherwise an even rotation.
    let skill: Skill;
    if (lead && others.length) {
      skill = day % 3 === 0 ? others[otherCursor++ % others.length]! : lead;
    } else if (lead) {
      skill = lead;
    } else {
      skill = rotation[(day - 1) % rotation.length]!;
    }

    // Day 1 is today, not tomorrow. A plan whose first task lands tomorrow
    // leaves the dashboard with nothing to put under "Today".
    const date = addDays(today, day - 1);

    if (skill === strategy.lessonSkill && pendingLesson) {
      const lesson = pendingLesson;
      pendingLesson = null;
      tasks.push({
        day,
        date,
        skill,
        label: 'Learn the technique before drilling it',
        minutes: 15,
        target: lesson,
        href: strategy.href(skill, lesson),
      });
      continue;
    }

    const drills = drillsFor(skill);
    const nth = cursors.get(skill) ?? 0;
    cursors.set(skill, nth + 1);
    const drill = drills[nth % drills.length]!;
    const target = strategy.targetFor(skill, drill, catalogue, nth);

    tasks.push({
      day,
      date,
      skill,
      // The first graded-skill task names the actual weakness the grader
      // found, so the plan reads as a response to the report, not a template.
      label:
        skill === strategy.feedbackSkill &&
        nth === 0 &&
        input.weaknesses?.length
          ? `${drill.label} — focus: ${input.weaknesses[0]}`
          : drill.label,
      minutes: drill.minutes,
      target,
      href: target ? strategy.href(skill, target) : null,
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
  const { strategy } = input;
  const measured = measuredSkills(input);
  if (!measured.length) return strategy.noEstimateAction;
  // At target means every skill the plan covers is measured and at it. One
  // strong skill says nothing about the ones still below.
  if (
    input.targetScore != null &&
    measured.length === strategy.plannable.length &&
    measured.every((s) => scoreOf(input, s)! >= input.targetScore!)
  ) {
    return `You are at your target ${strategy.scoreNoun} in practice. Keep it warm.`;
  }
  const weakest = weakestSkill(input);
  if (weakest) {
    return `${SKILL_LABEL[weakest]} is holding your ${strategy.scoreNoun} back.`;
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
  /**
   * One entry per completed attempt submitted today, already scoped to the
   * plan's exam. `taskType` is set on attempts at exam task items.
   */
  completedToday: readonly {
    module: Skill;
    kind: 'practice' | 'diagnostic' | 'mock';
    taskType: string | null;
  }[];
  completedLessonIds: readonly string[];
  /** An attempt left open, if any: what the task it belongs to would match. */
  inProgress?: { module: Skill; taskType: string | null } | null;
};

/**
 * Label today's tasks against that evidence.
 *
 * A task's Nth occurrence today completes on its Nth matching attempt today,
 * so two reading tasks need two reading attempts rather than both lighting up
 * from one. What matches depends on the task:
 *
 * - An exam task drill matches only a **practice** attempt at the same task
 *   type. Read Aloud does not finish a Repeat Sentence drill just because both
 *   are Speaking, and a mock's children never tick drills.
 * - Anything else matches by skill. IELTS attempts carry a task type too
 *   (`reading_passage`, `writing_task_2`), so the skill key is counted for
 *   every attempt; an exam's plan is all one kind of task or the other.
 */
export function derivePlanState(
  tasks: PlanTask[],
  evidence: PlanEvidence,
  goalMinutes?: number | null,
): PlanProgress {
  const remaining = new Map<string, number>();
  const count = (key: string) =>
    remaining.set(key, (remaining.get(key) ?? 0) + 1);
  for (const a of evidence.completedToday) {
    count(`skill:${a.module}`);
    if (a.taskType && a.kind === 'practice') count(`task:${a.taskType}`);
  }

  let activeTaken = false;

  const stated = tasks.map((task): PlanTaskState => {
    if (task.target?.kind === 'lesson') {
      const done = evidence.completedLessonIds.includes(task.target.lessonId);
      return { ...task, status: done ? 'completed' : 'pending' };
    }

    const key =
      task.target?.kind === 'exam_task'
        ? `task:${task.target.taskType}`
        : `skill:${task.skill}`;
    const left = remaining.get(key) ?? 0;
    if (left > 0) {
      remaining.set(key, left - 1);
      return { ...task, status: 'completed' };
    }

    // Only one task is ever active: the first unfinished one, and only when a
    // matching attempt is genuinely open.
    const open = evidence.inProgress;
    const openMatches =
      open &&
      (task.target?.kind === 'exam_task'
        ? open.taskType === task.target.taskType
        : open.module === task.skill);
    if (!activeTaken && openMatches) {
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
  return task.href;
}
