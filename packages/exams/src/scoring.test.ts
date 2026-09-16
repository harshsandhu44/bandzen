import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getExam } from './registry.ts';
import {
  DETERMINISTIC_EVALUATORS as mark,
  evaluatorFor,
  formatScore,
  measuredSkillsFor,
  modelAssessment,
  objectiveAssessment,
  roundToScale,
} from './scoring.ts';

const scale = (exam: string) => getExam(exam)!.scoreScale;

test('scores snap to each exam scale, never outside it', () => {
  assert.equal(roundToScale(scale('ielts'), 7.26), 7.5);
  assert.equal(roundToScale(scale('ielts'), 11), 9);
  assert.equal(roundToScale(scale('ielts'), -2), 0);
  assert.equal(roundToScale(scale('pte_academic'), 78.6), 79);
  assert.equal(roundToScale(scale('pte_academic'), 3), 10);
  assert.equal(roundToScale(scale('toefl_ibt'), 4.3), 4.5);
  assert.equal(roundToScale(scale('det'), 87), 85);
  assert.equal(roundToScale(scale('det'), 200), 160);
});

test('formatting follows the step, not the word band', () => {
  assert.equal(formatScore(scale('ielts'), 7), '7.0');
  assert.equal(formatScore(scale('toefl_ibt'), 4.5), '4.5');
  assert.equal(formatScore(scale('pte_academic'), 79), '79');
  assert.equal(formatScore(scale('det'), 115), '115');
});

test('a task contributes to every skill it measures', () => {
  // Repeat Sentence is one of PTE's integrated types: the score guide credits
  // it to Listening and Speaking both.
  assert.deepEqual(
    measuredSkillsFor('pte_academic', 'repeat_sentence', 'speaking'),
    [
      { skill: 'listening', weight: 0.5 },
      { skill: 'speaking', weight: 0.5 },
    ],
  );
  // Read Aloud is not, whatever its name suggests — Speaking only.
  assert.deepEqual(
    measuredSkillsFor('pte_academic', 'read_aloud', 'speaking'),
    [{ skill: 'speaking', weight: 1 }],
  );
  // An IELTS attempt-level unit is not a task definition: its module counts.
  assert.deepEqual(measuredSkillsFor('ielts', 'reading_passage', 'reading'), [
    { skill: 'reading', weight: 1 },
  ]);
});

test('evaluator resolution is explicit per exam and task', () => {
  assert.equal(
    evaluatorFor('ielts', 'reading_multiple_choice').kind,
    'deterministic',
  );
  assert.equal(evaluatorFor('pte_academic', 'write_essay').kind, 'model');
  assert.equal(evaluatorFor('pte_academic', 'write_essay').mark, null);
  assert.throws(() => evaluatorFor('toefl_ibt', 'write_essay'));
});

test('deterministic markers', () => {
  assert.deepEqual(mark.exact_match(['True'], ' TRUE '), {
    correct: 1,
    total: 1,
  });
  assert.deepEqual(mark.exact_match(['True'], ''), { correct: 0, total: 1 });
  // Two right, one wrong: 2 - 1.
  assert.deepEqual(mark.multi_match(['A', 'C'], '["A","B","C"]'), {
    correct: 1,
    total: 2,
  });
  assert.deepEqual(mark.multi_match(['A'], '["B","C"]'), {
    correct: 0,
    total: 1,
  });
  // Key 0>1>2>3; given 1,0,2,3 keeps only the 2>3 pair.
  assert.deepEqual(
    mark.order_match(['0', '1', '2', '3'], '["1","0","2","3"]'),
    { correct: 1, total: 3 },
  );
  assert.deepEqual(
    mark.gap_match(['cools|cool', 'flooding'], '["Cool","floods"]'),
    { correct: 1, total: 2 },
  );
  assert.deepEqual(
    mark.dictation_match(['The river cools the city.'], 'the city river the'),
    { correct: 4, total: 5 },
  );
  assert.deepEqual(mark.multi_match(['A'], 'not json'), {
    correct: 0,
    total: 1,
  });
});

test('deterministic and model results share one contract', () => {
  const objective = objectiveAssessment({
    exam: 'ielts',
    examVersion: '2026',
    taskType: 'reading_passage',
    skill: 'reading',
    correct: 10,
    total: 13,
    score: 7,
  });
  const model = modelAssessment({
    exam: 'ielts',
    examVersion: '2026',
    taskType: 'writing_task_2',
    skill: 'writing',
    score: 6.5,
    criteria: [{ name: 'Task Response', band: 6 }],
    feedback: [{ quote: 'x', kind: 'grammar', comment: 'y' }],
    strengths: ['s'],
    weaknesses: ['w'],
  });
  assert.deepEqual(Object.keys(objective).sort(), Object.keys(model).sort());
  assert.deepEqual(objective.dimensions, { correct: 10, total: 13 });
  assert.deepEqual(model.dimensions, { 'Task Response': 6 });
  assert.deepEqual(model.measuredSkills, [{ skill: 'writing', weight: 1 }]);
});
