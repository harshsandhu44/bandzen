import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IELTS_PLAN } from './plan-strategies.ts';
import {
  buildPlan,
  derivePlanState,
  nextAction,
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

const TODAY = new Date('2026-09-01T10:00:00Z');

test('the plan runs from today up to the day before the exam', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 6,
      targetBand: 8,
      testDate: '2026-09-06',
      today: TODAY,
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
      catalogue: { trackIds: ['t1', 't2'] },
    }),
  );
  const listening = plan.filter((t) => t.skill === 'listening');
  // Weakest by more than a band -> two days in three.
  assert.equal(listening.length, 10);
  assert.deepEqual(listening[0]?.target, { kind: 'listening', trackId: 't1' });
  assert.deepEqual(listening[1]?.target, { kind: 'listening', trackId: 't2' });
});

const CATALOGUE = {
  passageIds: ['p1', 'p2'],
  // Task 2 only, which is what is actually seeded today.
  prompts: [{ id: 'w1', task: 2 }],
};

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

test('an empty catalogue yields no target rather than a broken link', () => {
  const plan = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 6.5,
      targetBand: 8,
      testDate: null,
      today: TODAY,
    }),
  );
  assert.equal(
    plan.every((t) => t.target === null),
    true,
  );
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

test('task state comes from attempts, and counts them one for one', () => {
  const tasks = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 6.5,
      targetBand: 8,
      testDate: null,
      today: TODAY,
      catalogue: CATALOGUE,
    }),
  ).slice(0, 3); // reading, writing, reading

  const { tasks: stated, minutesDone } = derivePlanState(tasks, {
    modulesCompletedToday: ['reading'],
    completedLessonIds: [],
    moduleInProgress: 'writing',
  });

  assert.equal(stated[0]?.status, 'completed');
  assert.equal(stated[1]?.status, 'active');
  // One reading attempt completes one reading task, not both.
  assert.equal(stated[2]?.status, 'pending');
  assert.equal(minutesDone, tasks[0]!.minutes);
});

test('the goal falls back to what the plan asks for', () => {
  const tasks = buildPlan(
    ielts({
      readingBand: 7,
      writingBand: 6.5,
      targetBand: 8,
      testDate: null,
      today: TODAY,
    }),
  ).slice(0, 2);

  const evidence = { modulesCompletedToday: [], completedLessonIds: [] };
  const total = tasks[0]!.minutes + tasks[1]!.minutes;

  assert.equal(derivePlanState(tasks, evidence).minutesGoal, total);
  assert.equal(derivePlanState(tasks, evidence, 60).minutesGoal, 60);
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
