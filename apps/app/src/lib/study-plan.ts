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
   * Target ids already in this candidate's ledger for the exam, oldest first.
   * New work prefers content not yet assigned, and once the pool is spent
   * repeats whatever was assigned longest ago.
   */
  assignedTargetIds?: readonly string[];
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
  /**
   * The candidate's daily study time. Each day is filled to it: tasks are
   * added until the day reaches it, never past it by more than a quarter, and
   * a single task longer than the whole day still gets its day. Null keeps
   * one task a day.
   */
  dailyMinutes?: number | null;
  /** ISO weekdays (1 = Monday … 7 = Sunday) they study. Absent means every day. */
  studyDays?: readonly number[];
};

const MAX_DAYS = 14;
/** How far past a day's minutes packing may go. */
export const CAPACITY_TOLERANCE = 1.25;
/** A backstop on one day's list, whatever the minutes say. */
const MAX_TASKS_PER_DAY = 6;
const DAY_MS = 86_400_000;

/** Calendar arithmetic on ISO dates, done in UTC so no offset can shift a day. */
export const addDays = (isoDate: string, days: number) =>
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

/** Whether a local ISO date falls on one of the candidate's study days. */
export function isStudyDay(isoDate: string, studyDays?: readonly number[]) {
  if (!studyDays) return true;
  const weekday = new Date(`${isoDate}T00:00:00Z`).getUTCDay() || 7;
  return studyDays.includes(weekday);
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
  const { lessonForKind, completedLessonIds, assignedTargetIds } =
    input.catalogue ?? {};
  if (!lessonForKind) return null;

  for (const kind of input.weakKinds ?? []) {
    const lessonId = lessonForKind[kind];
    // Read, or already committed to a day: either way not scheduled again.
    if (
      lessonId &&
      !completedLessonIds?.includes(lessonId) &&
      !assignedTargetIds?.includes(lessonId)
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
  // Counts tasks, not days: with several tasks a day the rotation still runs
  // two in three to the weakest skill across the whole plan.
  let n = 0;

  // Spent on the lesson skill's first slot only; after that the drills take over.
  let pendingLesson = lessonFirst(input);
  const cap = input.dailyMinutes ?? null;

  /** The next task the rotation would give, without taking it. */
  const peek = (day: number, date: string) => {
    // With a clear gap the weakest skill takes two tasks in three, the third
    // cycling through the rest; otherwise an even rotation.
    const usesOther = lead && others.length && n % 3 === 2;
    const skill: Skill = usesOther
      ? others[otherCursor % others.length]!
      : (lead ?? rotation[n % rotation.length]!);

    if (skill === strategy.lessonSkill && pendingLesson) {
      const lesson = pendingLesson;
      return {
        usesOther,
        lesson: true,
        task: {
          day,
          date,
          skill,
          label: 'Learn the technique before drilling it',
          minutes: 15,
          target: lesson,
          href: strategy.href(skill, lesson),
        } satisfies PlanTask,
      };
    }

    const drills = drillsFor(skill);
    const nth = cursors.get(skill) ?? 0;
    const drill = drills[nth % drills.length]!;
    const target = strategy.targetFor(skill, drill, catalogue, nth);
    return {
      usesOther,
      lesson: false,
      task: {
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
      } satisfies PlanTask,
    };
  };

  for (let day = 1; day <= horizon; day += 1) {
    // Day 1 is today, not tomorrow. A plan whose first task lands tomorrow
    // leaves the dashboard with nothing to put under "Today".
    const date = addDays(today, day - 1);
    if (!isStudyDay(date, input.studyDays)) continue;

    let load = 0;
    for (let k = 0; k < MAX_TASKS_PER_DAY; k += 1) {
      const next = peek(day, date);
      if (
        load > 0 &&
        (cap == null ||
          load >= cap ||
          load + next.task.minutes > cap * CAPACITY_TOLERANCE)
      ) {
        break;
      }
      tasks.push(next.task);
      load += next.task.minutes;
      n += 1;
      if (next.usesOther) otherCursor += 1;
      if (next.lesson) pendingLesson = null;
      else
        cursors.set(next.task.skill, (cursors.get(next.task.skill) ?? 0) + 1);
    }
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
// The ledger — what has been committed to the candidate (#131)
// ---------------------------------------------------------------------------

/** Bumped whenever the rules above change what a committed task would be. */
export const PLANNER_VERSION = 'plan-2026-09.v1';

/** Days written to the ledger ahead of time. Beyond them the plan is a projection. */
export const COMMIT_DAYS = 7;

export type AssignmentStatus =
  'pending' | 'in_progress' | 'completed' | 'skipped' | 'deferred';

export type TargetKind =
  'passage' | 'prompt' | 'track' | 'lesson' | 'task_type';

/** A `plan_assignments` row, as far as the plan reads it. */
export type AssignmentRow = {
  id: string;
  date: string;
  originalDate: string;
  slot: number;
  skill: Skill;
  targetKind: TargetKind;
  targetId: string;
  label: string;
  minutes: number;
  status: AssignmentStatus;
  /** The plan revision it was committed under. */
  revision: number;
};

export function targetRef(target: PlanTarget): {
  targetKind: TargetKind;
  targetId: string;
} {
  switch (target.kind) {
    case 'reading':
      return { targetKind: 'passage', targetId: target.passageId };
    case 'writing':
      return { targetKind: 'prompt', targetId: target.promptId };
    case 'listening':
      return { targetKind: 'track', targetId: target.trackId };
    case 'lesson':
      return { targetKind: 'lesson', targetId: target.lessonId };
    case 'exam_task':
      return { targetKind: 'task_type', targetId: target.taskType };
  }
}

export function targetFromRef(kind: TargetKind, id: string): PlanTarget {
  switch (kind) {
    case 'passage':
      return { kind: 'reading', passageId: id };
    case 'prompt':
      return { kind: 'writing', promptId: id };
    case 'track':
      return { kind: 'listening', trackId: id };
    case 'lesson':
      return { kind: 'lesson', lessonId: id };
    case 'task_type':
      return { kind: 'exam_task', taskType: id };
  }
}

/** Whether the catalogue can still open a committed target. */
export function targetAvailable(
  kind: TargetKind,
  id: string,
  catalogue: PlanCatalogue,
): boolean {
  switch (kind) {
    case 'passage':
      return catalogue.passageIds?.includes(id) ?? false;
    case 'prompt':
      return catalogue.prompts?.some((p) => p.id === id) ?? false;
    case 'track':
      return catalogue.trackIds?.includes(id) ?? false;
    case 'lesson':
      return Object.values(catalogue.lessonForKind ?? {}).includes(id);
    case 'task_type':
      return catalogue.examTaskTypes?.includes(id) ?? false;
  }
}

/**
 * Missed work: anything not finished from before today moves forward, in the
 * order it was due, to the first study day from today with room for it —
 * room meaning the day is empty or stays inside its minutes plus tolerance.
 * It keeps its id, so its history survives the move; `originalDate` says it
 * was carried over. With no daily minutes, it all lands on today.
 */
export function rollForward(
  rows: readonly AssignmentRow[],
  today: string,
  pace: { dailyMinutes?: number | null; studyDays?: readonly number[] } = {},
): { id: string; date: string; slot: number }[] {
  const missed = rows
    .filter(
      (r) =>
        r.date < today &&
        (r.status === 'pending' || r.status === 'in_progress'),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.slot - b.slot);

  const load = new Map<string, number>();
  const slots = new Map<string, number>();
  for (const r of rows) {
    if (r.date < today) continue;
    slots.set(r.date, Math.max(slots.get(r.date) ?? -1, r.slot));
    if (r.status !== 'skipped' && r.status !== 'deferred') {
      load.set(r.date, (load.get(r.date) ?? 0) + r.minutes);
    }
  }

  const cap = pace.dailyMinutes;
  return missed.map((r) => {
    let date = today;
    for (;;) {
      const used = load.get(date) ?? 0;
      if (
        isStudyDay(date, pace.studyDays) &&
        (cap == null ||
          used === 0 ||
          used + r.minutes <= cap * CAPACITY_TOLERANCE)
      ) {
        break;
      }
      date = addDays(date, 1);
    }
    load.set(date, (load.get(date) ?? 0) + r.minutes);
    const slot = (slots.get(date) ?? -1) + 1;
    slots.set(date, slot);
    return { id: r.id, date, slot };
  });
}

/**
 * The planned tasks to write: those on days inside the commit window that
 * hold nothing yet. A day with any row is already committed and is never
 * regenerated by a read — except that a skip from before the latest replan
 * no longer holds its day, or replanning could leave that day empty.
 */
export function tasksToCommit(
  plan: readonly PlanTask[],
  rows: readonly AssignmentRow[],
  today: string,
  revision = 1,
) {
  const committed = new Set(
    rows
      .filter((r) => r.status !== 'skipped' || r.revision >= revision)
      .map((r) => r.date),
  );
  const last = addDays(today, COMMIT_DAYS - 1);
  // New work goes after anything a day already holds, so it never collides.
  const slots = new Map<string, number>();
  for (const r of rows) {
    slots.set(r.date, Math.max(slots.get(r.date) ?? 0, r.slot + 1));
  }
  return plan
    .filter((t) => t.target && t.date <= last && !committed.has(t.date))
    .map((t) => {
      const slot = slots.get(t.date) ?? 0;
      slots.set(t.date, slot + 1);
      return { ...t, target: t.target!, slot };
    });
}

export type StudyTaskStatus = 'pending' | 'active' | 'completed';

export type PlanTaskState = PlanTask & {
  /** The assignment id; projected days past the commit window have none. */
  id: string | null;
  status: StudyTaskStatus;
  /** Set when this was due on an earlier day and carried over. */
  carriedFrom: string | null;
};

export type PlanProgress = {
  tasks: PlanTaskState[];
  minutesDone: number;
  /** Minutes of work planned today: finishing every task reaches it. */
  minutesGoal: number;
  /** The candidate's own daily minutes, shown beside the plan. */
  dailyMinutes: number | null;
};

/**
 * Ledger rows as plan tasks. Links carry the assignment id, so the attempt
 * they start is filed against exactly this task. Skipped and deferred rows
 * are history, not work, and are left out.
 */
export function assignmentTasks(
  rows: readonly AssignmentRow[],
  strategy: PlanStrategy,
  today: string,
): PlanTaskState[] {
  return rows
    .filter((r) => r.status !== 'skipped' && r.status !== 'deferred')
    .sort((a, b) => a.date.localeCompare(b.date) || a.slot - b.slot)
    .map((r) => {
      const target = targetFromRef(r.targetKind, r.targetId);
      const href = strategy.href(r.skill, target);
      return {
        id: r.id,
        day: daysUntil(today, r.date) + 1,
        date: r.date,
        skill: r.skill,
        label: r.label,
        minutes: r.minutes,
        target,
        // Lessons complete by slug on their own; everything else is linked.
        href:
          target.kind === 'lesson'
            ? href
            : `${href}${href.includes('?') ? '&' : '?'}a=${r.id}`,
        status:
          r.status === 'completed'
            ? 'completed'
            : r.status === 'in_progress'
              ? 'active'
              : 'pending',
        carriedFrom: r.originalDate !== r.date ? r.originalDate : null,
      };
    });
}

/**
 * Today's tasks and the minutes they account for. The bar is measured
 * against what was planned, so doing all of it reads as all of it, even on a
 * day packed a little past the candidate's own minutes.
 */
export function planProgress(
  tasks: readonly PlanTaskState[],
  today: string,
  dailyMinutes?: number | null,
): PlanProgress {
  const todays = tasks.filter((t) => t.date === today);
  const sum = (list: readonly PlanTaskState[]) =>
    list.reduce((total, t) => total + t.minutes, 0);
  return {
    tasks: todays,
    minutesDone: sum(todays.filter((t) => t.status === 'completed')),
    minutesGoal: sum(todays),
    dailyMinutes: dailyMinutes ?? null,
  };
}

/**
 * Where a task actually opens. Null means we have nothing real to link to --
 * a task whose material is not seeded yet must not render a dead link.
 */
export function targetHref(task: PlanTask): string | null {
  return task.href;
}
