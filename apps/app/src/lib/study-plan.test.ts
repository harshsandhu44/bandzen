import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IELTS_PLAN, PTE_PLAN } from './plan-strategies.ts';
import {
  assignmentTasks,
  buildPlan,
  isStudyDay,
  nextAction,
  planProgress,
  rollForward,
  targetAvailable,
  targetFromRef,
  targetRef,
  tasksToCommit,
  testDayState,
  type AssignmentRow,
  type PlanInput,
  type PlanStrategy,
} from './study-plan.ts';

/** The IELTS inputs these tests were written against, in the engine's terms. */
function ielts({
  readingBand,
  writingBand,
  listeningBand,
  targetBand,
  ...rest
}: Omit<PlanInput, 'strategy' | 'scores' | 'targetScore'> & {
  readingBand: number | null;
  writingBand: number | null;
  listeningBand?: number | null;
  targetBand: number | null;
}): PlanInput {
  return {
    ...rest,
    strategy: IELTS_PLAN,
    scores: {
      reading: readingBand,
      writing: writingBand,
      listening: listeningBand,
    },
    targetScore: targetBand,
  };
}

const TODAY = '2026-09-01';

const CATALOGUE = {
  passageIds: ['p1', 'p2'],
  // Task 2 only, which is what is actually seeded today.
  prompts: [{ id: 'w1', task: 2 }],
};

test('the plan runs from today up to the day before the exam', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 6,
      targetBand: 8,
      testDate: '2026-09-06',
      today: TODAY,
      catalogue: CATALOGUE,
    }),
  );
  assert.equal(plan.length, 5);
  assert.equal(plan[0]?.date, '2026-09-01', 'the first task is today');
  // Nothing is scheduled on exam day itself -- that day is the exam.
  assert.equal(plan.at(-1)?.date, '2026-09-05');
});

test('a test date in the past yields no tasks rather than negative days', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 6,
      targetBand: 8,
      testDate: '2026-08-01',
      today: TODAY,
      catalogue: CATALOGUE,
    }),
  );
  assert.deepEqual(plan, []);
});

test('no test date runs a fortnight', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 6,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      catalogue: CATALOGUE,
    }),
  );
  assert.equal(plan.length, 14);
});

test('a clear gap skews two days in three to the weaker skill', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 8,
      writingBand: 6,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      catalogue: CATALOGUE,
    }),
  );
  const writing = plan.filter((t) => t.skill === 'writing').length;
  assert.equal(writing, 10, 'expected 10 of 14 days on the weaker skill');
  assert.equal(plan.length - writing, 4);
});

test('bands within half a band alternate evenly', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 6.5,
      writingBand: 6,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      catalogue: CATALOGUE,
    }),
  );
  const writing = plan.filter((t) => t.skill === 'writing').length;
  assert.equal(writing, 7);
});

test('the first writing task names the reported weakness', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 8,
      writingBand: 6,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      catalogue: CATALOGUE,
      weaknesses: ['paragraphs assert without supporting'],
    }),
  );
  const firstWriting = plan.find((t) => t.skill === 'writing');
  assert.match(firstWriting!.label, /paragraphs assert without supporting/);
  // ...and only the first one, so the plan does not nag.
  const tagged = plan.filter((t) => t.label.includes('focus:')).length;
  assert.equal(tagged, 1);
});

test('nextAction reports no estimate before any attempt', () => {
  const line = nextAction(
    ielts({
      readingBand: null,
      writingBand: null,
      targetBand: 8,
      testDate: null,
      today: TODAY,
    }),
  );
  assert.match(line, /diagnostic/i);
});

test('nextAction names the weaker skill', () => {
  const line = nextAction(
    ielts({
      readingBand: 8,
      writingBand: 6,
      targetBand: 8,
      testDate: null,
      today: TODAY,
    }),
  );
  assert.match(line, /^Writing/);
});

test('nextAction names Listening when it is the weakest measured skill', () => {
  const line = nextAction(
    ielts({
      readingBand: 7.5,
      writingBand: 7,
      listeningBand: 5.5,
      targetBand: 8,
      testDate: null,
      today: TODAY,
    }),
  );
  assert.match(line, /^Listening/);
});

test('a measured Listening band puts listening drills in the rotation', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 7,
      listeningBand: 5.5,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      catalogue: { ...CATALOGUE, trackIds: ['t1', 't2'] },
    }),
  );
  const listening = plan.filter((t) => t.skill === 'listening');
  // Weakest by more than a band -> two days in three.
  assert.equal(listening.length, 10);
  assert.deepEqual(listening[0]?.target, { kind: 'listening', trackId: 't1' });
  assert.deepEqual(listening[1]?.target, { kind: 'listening', trackId: 't2' });
});

test('tasks resolve to something the Continue button can open', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 6.5,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      catalogue: CATALOGUE,
    }),
  );

  const reading = plan.filter((t) => t.skill === 'reading');
  assert.deepEqual(reading[0]?.target, { kind: 'reading', passageId: 'p1' });
  // Rotates, so two reading days running do not hand back the same passage.
  assert.deepEqual(reading[1]?.target, { kind: 'reading', passageId: 'p2' });
  assert.deepEqual(reading[2]?.target, { kind: 'reading', passageId: 'p1' });

  assert.deepEqual(plan.find((t) => t.skill === 'writing')?.target, {
    kind: 'writing',
    promptId: 'w1',
  });
});

test('an empty catalogue schedules nothing rather than dead tasks', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 6.5,
      targetBand: 8,
      testDate: null,
      today: TODAY,
    }),
  );
  assert.deepEqual(plan, []);
});

test('a skill with no material drops out instead of holding empty days', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 6.5,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      catalogue: { passageIds: ['p1'] },
    }),
  );
  assert.equal(plan.length, 14);
  assert.ok(plan.every((t) => t.skill === 'reading' && t.href));
});

test('dates follow the local date passed in, not the server clock', () => {
  // 23:30 in Auckland on 1 Sept is still 31 Aug in UTC.
  const plan = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 7,
      targetBand: 8,
      testDate: '2026-09-03',
      today: '2026-09-01',
      catalogue: CATALOGUE,
    }),
  );
  assert.deepEqual(
    plan.map((t) => t.date),
    ['2026-09-01', '2026-09-02'],
  );
});

test('unmeasured skills stay in the rotation once one is measured', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 6,
      writingBand: null,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      catalogue: { ...CATALOGUE, trackIds: ['t1'] },
    }),
  );
  assert.deepEqual(
    new Set(plan.map((t) => t.skill)),
    new Set(['listening', 'reading', 'writing']),
  );
});

test('at target needs every plannable skill measured and at it', () => {
  const at = (listeningBand: number | null) =>
    nextAction(
      ielts({
        readingBand: 8,
        writingBand: 8,
        listeningBand,
        targetBand: 7.5,
        testDate: null,
        today: TODAY,
      }),
    );
  assert.match(at(8), /at your target/);
  assert.doesNotMatch(at(null), /at your target/);
  assert.doesNotMatch(at(6), /at your target/);
});

test('the test date sets an explicit exam-day state', () => {
  assert.equal(testDayState('2026-09-01', '2026-09-01'), 'exam_day');
  assert.equal(testDayState('2026-09-02', '2026-09-01'), 'passed');
  assert.equal(testDayState('2026-09-01', '2026-09-10'), null);
  assert.equal(testDayState('2026-09-01', null), null);
});

test('an unread lesson for the weakest kind is taught before it is drilled', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 6,
      writingBand: 7,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      weakKinds: ['matching_headings'],
      catalogue: {
        ...CATALOGUE,
        lessonForKind: { matching_headings: 'reading-matching-headings' },
        completedLessonIds: [],
      },
    }),
  );

  const firstReading = plan.find((t) => t.skill === 'reading');
  assert.deepEqual(firstReading?.target, {
    kind: 'lesson',
    lessonId: 'reading-matching-headings',
  });
  // Only the first slot is spent on it, and the drill rotation is untouched.
  assert.equal(plan.filter((t) => t.target?.kind === 'lesson').length, 1);
  const drills = plan.filter((t) => t.target?.kind === 'reading');
  assert.deepEqual(drills[0]?.target, { kind: 'reading', passageId: 'p1' });
});

test('a lesson already read is not taught again', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 6,
      writingBand: 7,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      weakKinds: ['matching_headings'],
      catalogue: {
        ...CATALOGUE,
        lessonForKind: { matching_headings: 'reading-matching-headings' },
        completedLessonIds: ['reading-matching-headings'],
      },
    }),
  );
  assert.equal(
    plan.some((t) => t.target?.kind === 'lesson'),
    false,
  );
});

const row = (over: Partial<AssignmentRow>): AssignmentRow => ({
  id: 'a1',
  date: TODAY,
  originalDate: TODAY,
  slot: 0,
  skill: 'reading',
  targetKind: 'passage',
  targetId: 'p1',
  label: 'Full passage, timed',
  minutes: 40,
  status: 'pending',
  ...over,
});

test('a lesson already assigned is not scheduled again', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 6,
      writingBand: 7,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      weakKinds: ['matching_headings'],
      catalogue: {
        ...CATALOGUE,
        lessonForKind: { matching_headings: 'reading-matching-headings' },
        assignedTargetIds: ['reading-matching-headings'],
      },
    }),
  );
  assert.equal(
    plan.some((t) => t.target?.kind === 'lesson'),
    false,
  );
});

test('new work prefers content never assigned, then the longest ago', () => {
  const pick = (assignedTargetIds: string[]) =>
    buildPlan(
      ielts({
        readingBand: 6,
        writingBand: 8,
        targetBand: 8,
        testDate: null,
        today: TODAY,
        catalogue: {
          ...CATALOGUE,
          passageIds: ['p1', 'p2', 'p3'],
          assignedTargetIds,
        },
      }),
    ).find((t) => t.skill === 'reading')?.target;
  // Crossing midnight no longer restarts at the first passage.
  assert.deepEqual(pick(['p1']), { kind: 'reading', passageId: 'p2' });
  assert.deepEqual(pick(['p2', 'p1', 'p3']), {
    kind: 'reading',
    passageId: 'p2',
  });
});

test('only empty days inside the window are committed, slotted in order', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 7,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      catalogue: CATALOGUE,
    }),
  );
  const fresh = tasksToCommit(plan, [row({ date: '2026-09-02' })], TODAY);
  assert.deepEqual(
    fresh.map((t) => [t.date, t.slot]),
    [
      ['2026-09-01', 0],
      ['2026-09-03', 0],
      ['2026-09-04', 0],
      ['2026-09-05', 0],
      ['2026-09-06', 0],
      ['2026-09-07', 0],
    ],
  );
});

test('missed work rolls to today after what today holds, keeping its id', () => {
  const moves = rollForward(
    [
      row({ id: 'late2', date: '2026-08-31', slot: 0 }),
      row({ id: 'late1', date: '2026-08-30', slot: 0, status: 'in_progress' }),
      row({ id: 'done', date: '2026-08-30', slot: 1, status: 'completed' }),
      row({ id: 'skipped', date: '2026-08-29', status: 'skipped' }),
      row({ id: 'today', date: TODAY, slot: 0 }),
    ],
    TODAY,
  );
  assert.deepEqual(moves, [
    { id: 'late1', date: TODAY, slot: 1 },
    { id: 'late2', date: TODAY, slot: 2 },
  ]);
});

test('ledger rows render with their state, link and carry-over', () => {
  const tasks = assignmentTasks(
    [
      row({
        id: 'b',
        slot: 1,
        status: 'in_progress',
        originalDate: '2026-08-30',
      }),
      row({ id: 'a', slot: 0, status: 'completed' }),
      row({ id: 'c', slot: 2, status: 'skipped' }),
      row({ id: 'd', date: '2026-09-02', originalDate: '2026-09-02' }),
    ],
    IELTS_PLAN,
    TODAY,
  );
  assert.deepEqual(
    tasks.map((t) => [t.id, t.status, t.carriedFrom]),
    [
      ['a', 'completed', null],
      ['b', 'active', '2026-08-30'],
      ['d', 'pending', null],
    ],
  );
  assert.equal(tasks[0]!.href, '/reading?passage=p1&a=a');

  const progress = planProgress(tasks, TODAY);
  assert.equal(progress.tasks.length, 2);
  assert.equal(progress.minutesDone, 40);
  assert.equal(progress.minutesGoal, 80);
  // The candidate's minutes sit beside the plan; they are not its denominator.
  const withTarget = planProgress(tasks, TODAY, 60);
  assert.equal(withTarget.minutesGoal, 80);
  assert.equal(withTarget.dailyMinutes, 60);
});

const PTE_CATALOGUE = {
  examTaskTypes: [
    'read_aloud',
    'repeat_sentence',
    'write_essay',
    'summarize_written_text',
    'reorder_paragraphs',
    'write_from_dictation',
  ],
};

const minutesByDay = (plan: { date: string; minutes: number }[]) => {
  const days = new Map<string, number>();
  for (const t of plan) days.set(t.date, (days.get(t.date) ?? 0) + t.minutes);
  return days;
};

test('each day is filled to the daily minutes, within the tolerance', () => {
  const plan = buildPlan({
    strategy: PTE_PLAN,
    scores: {},
    targetScore: 79,
    testDate: null,
    today: TODAY,
    catalogue: PTE_CATALOGUE,
    dailyMinutes: 60,
  });
  const days = minutesByDay(plan);
  assert.equal(days.size, 14);
  for (const minutes of days.values()) {
    assert.ok(minutes >= 60 && minutes <= 75, `${minutes} min`);
  }
  // Completing everything planned is 100%, whatever the daily minutes were.
  const today = assignmentTasks(
    plan
      .filter((t) => t.date === TODAY)
      .map((t, slot) =>
        row({
          id: `t${slot}`,
          slot,
          skill: t.skill,
          ...targetRef(t.target!),
          minutes: t.minutes,
          status: 'completed',
        }),
      ),
    PTE_PLAN,
    TODAY,
  );
  const progress = planProgress(today, TODAY, 60);
  assert.equal(progress.minutesDone, progress.minutesGoal);
});

test('a task longer than the day still gets its day, alone', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 5,
      writingBand: 8,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      catalogue: { passageIds: ['p1'] },
      dailyMinutes: 20,
    }),
  );
  const first = plan.filter((t) => t.date === TODAY);
  assert.equal(first.length, 1);
  assert.equal(first[0]!.minutes, 25);
});

test('rest days get nothing', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 7,
      targetBand: 8,
      testDate: null,
      // 2026-09-01 is a Tuesday; study Monday to Friday only.
      today: TODAY,
      catalogue: CATALOGUE,
      studyDays: [1, 2, 3, 4, 5],
    }),
  );
  assert.equal(isStudyDay('2026-09-05', [1, 2, 3, 4, 5]), false);
  assert.ok(!plan.some((t) => ['2026-09-05', '2026-09-06'].includes(t.date)));
  assert.equal(plan.length, 10);
});

test('missed work spreads over days with room, skipping rest days', () => {
  const moves = rollForward(
    [
      row({ id: 'm1', date: '2026-08-30', minutes: 40 }),
      row({ id: 'm2', date: '2026-08-31', minutes: 40 }),
      row({ id: 'today', date: TODAY, minutes: 30 }),
    ],
    TODAY,
    // Tuesday 1 Sept; Wednesday is a rest day.
    { dailyMinutes: 60, studyDays: [1, 2, 4, 5, 6, 7] },
  );
  assert.deepEqual(moves, [
    // 30 + 40 = 70 fits inside 60 × 1.25.
    { id: 'm1', date: TODAY, slot: 1 },
    { id: 'm2', date: '2026-09-03', slot: 0 },
  ]);
});

test('a committed target counts as available only while it is published', () => {
  assert.equal(targetAvailable('passage', 'p1', CATALOGUE), true);
  assert.equal(targetAvailable('passage', 'gone', CATALOGUE), false);
  assert.equal(
    targetAvailable('task_type', 'read_aloud', {
      examTaskTypes: ['read_aloud'],
    }),
    true,
  );
  assert.deepEqual(targetFromRef('prompt', 'w1'), {
    kind: 'writing',
    promptId: 'w1',
  });
  assert.deepEqual(targetRef({ kind: 'exam_task', taskType: 'x' }), {
    targetKind: 'task_type',
    targetId: 'x',
  });
});

test('a drill is not scheduled for a task with no prompts', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 6.5,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      catalogue: CATALOGUE, // Task 2 only.
    }),
  );

  // "Task 1 summary, full timing" used to be booked against Task 2 prompts:
  // the plan promised a chart summary and Continue opened a discursive essay.
  assert.equal(
    plan.some((t) => t.label.startsWith('Task 1')),
    false,
  );
  assert.ok(plan.some((t) => t.skill === 'writing'));
});

test('the Task 1 drill returns once a Task 1 prompt is seeded', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 6.5,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      catalogue: {
        ...CATALOGUE,
        prompts: [
          { id: 'w1', task: 2 },
          { id: 'w2', task: 1 },
        ],
      },
    }),
  );

  const taskOne = plan.find((t) => t.label.startsWith('Task 1 summary'));
  assert.ok(taskOne, 'the Task 1 drill should be scheduled');
  // And it opens a Task 1 prompt, not whichever prompt the rotation landed on.
  assert.deepEqual(taskOne.target, { kind: 'writing', promptId: 'w2' });
});

test('every task carries the route its exam strategy gives it', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 6.5,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      catalogue: CATALOGUE,
    }),
  );
  assert.equal(
    plan.find((t) => t.skill === 'reading')?.href,
    '/reading?passage=p1',
  );
  assert.equal(
    plan.find((t) => t.skill === 'writing')?.href,
    '/writing?prompt=w1',
  );
});

test('the engine plans any exam from its strategy, with no IELTS in it', () => {
  const strategy: PlanStrategy = {
    plannable: ['speaking', 'reading'],
    startingRotation: ['speaking'],
    meaningfulGap: 10,
    scoreNoun: 'score',
    noEstimateAction: 'Sit a practice test first.',
    drills: {
      speaking: [{ label: 'Read Aloud set', minutes: 10 }],
      reading: [{ label: 'Re-order Paragraphs set', minutes: 15 }],
    },
    canSchedule: () => true,
    targetFor: (skill, _drill, _catalogue, nth) => ({
      kind: 'lesson',
      lessonId: `${skill}-${nth}`,
    }),
    lessonSkill: null,
    feedbackSkill: null,
    href: (skill, target) =>
      `/pte/${skill}/${target.kind === 'lesson' ? target.lessonId : ''}`,
  };
  const input: PlanInput = {
    strategy,
    scores: { speaking: 50, reading: 70 },
    targetScore: 79,
    testDate: null,
    today: TODAY,
  };

  const plan = buildPlan(input);
  // A 20-point gap clears PTE's meaningful gap: speaking takes two days in three.
  assert.equal(plan.filter((t) => t.skill === 'speaking').length, 10);
  assert.equal(plan[0]?.label, 'Read Aloud set');
  assert.equal(plan[0]?.href, '/pte/speaking/speaking-0');
  assert.equal(nextAction(input), 'Speaking is holding your score back.');
  assert.equal(
    nextAction({ ...input, scores: {} }),
    'Sit a practice test first.',
  );
});
