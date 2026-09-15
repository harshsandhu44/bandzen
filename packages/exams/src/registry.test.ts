import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
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

test('invalid definitions are reported, not accepted', () => {
  const base = getExam('ielts')!;
  const broken: ExamDefinition = {
    ...base,
    scoreScale: { label: 'Band', min: 9, max: 0, step: 0.5 },
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
  has('declared twice');
  has('unknown section "maths"');
  has('unknown renderer "hologram"');
  has('unknown evaluator "vibes"');
  has('measures no known skill');
  has('impossible time window');
});
