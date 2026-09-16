import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pteScoreReport,
  pteSkillFractions,
  pteWeakestTaskTypes,
  taskFraction,
  type TaskOutcome,
} from './pte-scoring.ts';

const objective = (
  taskType: string,
  correct: number,
  total: number,
  skills: TaskOutcome['measuredSkills'],
): TaskOutcome => ({
  taskType,
  dimensions: { correct, total },
  measuredSkills: skills,
});

const graded = (
  taskType: string,
  traits: Record<string, number>,
  skills: TaskOutcome['measuredSkills'],
): TaskOutcome => ({
  taskType,
  dimensions: traits,
  measuredSkills: skills,
});

test('marks and traits both become a fraction of what the task was worth', () => {
  assert.equal(taskFraction(objective('reorder_paragraphs', 2, 4, [])), 0.5);
  // Traits are scored out of five.
  assert.equal(
    taskFraction(graded('write_essay', { Content: 5, Form: 5 }, [])),
    1,
  );
  assert.equal(
    taskFraction(graded('write_essay', { Content: 2, Form: 3 }, [])),
    0.5,
  );
});

test('a task nobody marked is not a task marked zero', () => {
  assert.equal(
    taskFraction({ taskType: 'x', dimensions: {}, measuredSkills: [] }),
    null,
  );
  assert.equal(
    taskFraction({
      taskType: 'x',
      dimensions: { Content: null },
      measuredSkills: [],
    }),
    null,
  );
});

test('an integrated task counts towards every skill it measures', () => {
  // Repeat Sentence is credited to listening and speaking, half each — one of
  // the eight types the score guide scores against two skills at once.
  const fractions = pteSkillFractions([
    graded(
      'repeat_sentence',
      { Content: 5, 'Oral fluency': 5, Pronunciation: 5 },
      [
        { skill: 'listening', weight: 0.5 },
        { skill: 'speaking', weight: 0.5 },
      ],
    ),
  ]);
  assert.equal(fractions.listening, 1);
  assert.equal(fractions.speaking, 1);
  // Nothing measured these, so they are unknown rather than zero.
  assert.equal(fractions.reading, null);
  assert.equal(fractions.writing, null);
});

test('the estimate lands on PTE’s own scale, and only for skills it measured', () => {
  const report = pteScoreReport([
    objective('reorder_paragraphs', 4, 4, [{ skill: 'reading', weight: 1 }]),
  ]);
  assert.equal(report.scale.min, 10);
  assert.equal(report.scale.max, 90);
  assert.equal(report.estimated, true);
  assert.equal(report.subscores?.reading, 90);
  assert.equal(report.subscores?.listening, null);
  // The overall is the mean of what was measured, not of four assumed skills.
  assert.equal(report.overall, 90);
  assert.equal(report.sections?.reading, 90);
  assert.equal(report.sections?.listening, null);
});

test('a half-right sitting lands mid-scale, not at zero', () => {
  const report = pteScoreReport([
    objective('reorder_paragraphs', 2, 4, [{ skill: 'reading', weight: 1 }]),
  ]);
  // 10 + 0.5 x 80 = 50.
  assert.equal(report.overall, 50);
});

test('the weakest task types come first, for a plan to point at', () => {
  const weakest = pteWeakestTaskTypes([
    objective('reorder_paragraphs', 4, 4, []),
    objective('write_from_dictation', 1, 4, []),
    objective('reading_multiple_choice_single', 2, 4, []),
  ]);
  assert.deepEqual(
    weakest.map((w) => w.taskType),
    [
      'write_from_dictation',
      'reading_multiple_choice_single',
      'reorder_paragraphs',
    ],
  );
});
