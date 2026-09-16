import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  examSkills,
  isOnScale,
  targetChoices,
  CURRENT_EXAM_VERSION,
  EXAM_KEYS,
  EXAMS,
  getExam,
  getTask,
  ieltsQuestionTask,
  timeLimitSeconds,
  validateDefinition,
  type ExamDefinition,
} from './registry.ts';

test('every exam key has exactly one valid definition', () => {
  assert.deepEqual(
    EXAMS.map((e) => e.key),
    [...EXAM_KEYS],
  );
  for (const exam of EXAMS) {
    assert.deepEqual(validateDefinition(exam), [], exam.key);
  }
});

test('versions match what is already stamped on stored rows', () => {
  assert.equal(CURRENT_EXAM_VERSION.ielts, '2026');
  assert.equal(CURRENT_EXAM_VERSION.toefl_ibt, '2026-01-21');
});

test('published task counts', () => {
  assert.equal(getExam('pte_academic')!.tasks.length, 22);
  assert.equal(getExam('det')!.tasks.length, 19);
});

test('lookup by exam and task key', () => {
  assert.equal(getExam('nope'), null);
  assert.equal(getTask('ielts', 'nope'), null);
  assert.equal(getTask('nope', 'read_aloud'), null);
  const readAloud = getTask('pte_academic', 'read_aloud')!;
  assert.equal(readAloud.renderer, 'recording');
  assert.deepEqual(readAloud.measuredSkills, ['reading', 'speaking']);
});

test('every stored IELTS question kind resolves to the renderer the runner used before', () => {
  const expected = {
    reading: {
      true_false_not_given: 'choice_cards',
      yes_no_not_given: 'choice_cards',
      multiple_choice: 'choice_cards',
      matching_headings: 'choice_select',
      sentence_completion: 'text_input',
    },
    listening: {
      multiple_choice: 'choice_cards',
      sentence_completion: 'text_input',
      matching: 'choice_select',
    },
  } as const;
  for (const [section, kinds] of Object.entries(expected)) {
    for (const [kind, renderer] of Object.entries(kinds)) {
      assert.equal(
        ieltsQuestionTask(section as 'reading' | 'listening', kind).renderer,
        renderer,
        `${section} ${kind}`,
      );
    }
  }
  assert.throws(() => ieltsQuestionTask('reading', 'matching'));
});

test('time limits come from the task window, else the section clock', () => {
  const ielts = getExam('ielts')!;
  assert.equal(
    timeLimitSeconds(ielts, getTask('ielts', 'reading_multiple_choice')!),
    3600,
  );
  assert.equal(
    timeLimitSeconds(ielts, getTask('ielts', 'speaking_part_2')!),
    180,
  );
  const toefl = getExam('toefl_ibt')!;
  assert.equal(
    timeLimitSeconds(toefl, getTask('toefl_ibt', 'read_in_daily_life')!),
    null,
  );
});

test('target choices come from each exam, on its own scale', () => {
  assert.deepEqual(
    targetChoices(getExam('ielts')!),
    [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9],
  );
  assert.equal(targetChoices(getExam('pte_academic')!).length, 13);
  assert.deepEqual(targetChoices(getExam('toefl_ibt')!).slice(0, 2), [3, 3.5]);
  assert.equal(targetChoices(getExam('det')!).at(-1), 160);
  assert.equal(isOnScale(getExam('ielts')!, 7.5), true);
  assert.equal(isOnScale(getExam('ielts')!, 7.3), false);
  assert.equal(isOnScale(getExam('pte_academic')!, 95), false);
  assert.equal(isOnScale(getExam('det')!, 115), true);
  assert.equal(isOnScale(getExam('det')!, 112), false);
});

test('an exam lists the skills its sections measure, once each', () => {
  assert.deepEqual(examSkills(getExam('ielts')!), [
    'listening',
    'reading',
    'writing',
    'speaking',
  ]);
  assert.deepEqual(examSkills(getExam('pte_academic')!), [
    'speaking',
    'writing',
    'reading',
    'listening',
  ]);
});

test('invalid definitions are reported, not accepted', () => {
  const base = getExam('ielts')!;
  const broken: ExamDefinition = {
    ...base,
    scoreScale: { label: 'Band', min: 9, max: 0, step: 0.5 },
    targetRange: { min: 5, max: 9.25, step: 0.5 },
    tasks: [
      ...base.tasks,
      { ...base.tasks[0]!, section: 'maths' },
      {
        ...base.tasks[1]!,
        key: 'odd',
        renderer: 'hologram' as never,
        evaluator: 'vibes' as never,
        measuredSkills: [],
        timing: { scope: 'task', prepSeconds: -1, responseSeconds: 0 },
      },
    ],
  };
  const problems = validateDefinition(broken);
  const has = (fragment: string) =>
    assert.ok(
      problems.some((p) => p.includes(fragment)),
      `expected a problem mentioning "${fragment}" in ${JSON.stringify(problems)}`,
    );
  has('is not a scale');
  has('does not fit the scale');
  has('declared twice');
  has('unknown section "maths"');
  has('unknown renderer "hologram"');
  has('unknown evaluator "vibes"');
  has('measures no known skill');
  has('impossible time window');
});

test('every PTE audio task plays once and starts itself', () => {
  const pte = getExam('pte_academic')!;
  for (const task of pte.tasks) {
    const shows = task.stimulus === 'audio' || task.stimulus === 'mixed';
    const where = `pte_academic/${task.key}`;
    if (!shows) {
      assert.equal(task.audio, undefined, `${where} has audio it never shows`);
      continue;
    }
    assert.deepEqual(
      task.audio,
      { plays: 1, autoplay: true },
      `${where} must be single-play`,
    );
  }
});

test('an impossible audio policy is reported', () => {
  const base = getExam('pte_academic')!;
  const broken: ExamDefinition = {
    ...base,
    tasks: [
      { ...base.tasks[0]!, key: 'silent', audio: { plays: 0, autoplay: true } },
      {
        ...base.tasks[0]!,
        key: 'unheard',
        stimulus: 'text',
        audio: { plays: 1, autoplay: true, startDelaySeconds: -3 },
      },
    ],
  };
  const problems = validateDefinition(broken);
  const has = (fragment: string) =>
    assert.ok(
      problems.some((p) => p.includes(fragment)),
      `expected "${fragment}" in ${JSON.stringify(problems)}`,
    );
  has('allows no plays');
  has('has an audio policy but shows no audio');
  has('starts its audio before it begins');
});
