import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInsight } from './insight.ts';

const CRITERIA = [
  { name: 'Task Response', band: 6, comment: 'Claims are not developed.' },
  { name: 'Coherence and Cohesion', band: 7, comment: 'Well sequenced.' },
  { name: 'Lexical Resource', band: 6.5, comment: 'Some repetition.' },
  { name: 'Grammatical Range and Accuracy', band: 7, comment: 'Accurate.' },
];

const KINDS = [
  { kind: 'matching_headings', correct: 2, total: 10, accuracy: 0.2 },
  { kind: 'multiple_choice', correct: 9, total: 10, accuracy: 0.9 },
];

test('the weaker module decides, and writing surfaces the grader’s own words', () => {
  const insight = buildInsight({
    readingBand: 7.5,
    writingBand: 6,
    criteria: CRITERIA,
    kindAccuracy: KINDS,
  });
  assert.equal(insight?.module, 'writing');
  assert.equal(insight?.focus, 'Task Response');
  assert.equal(insight?.summary, 'Claims are not developed.');
});

test('when reading is weaker it names the worst question kind', () => {
  const insight = buildInsight({
    readingBand: 5.5,
    writingBand: 7.5,
    criteria: CRITERIA,
    kindAccuracy: KINDS,
  });
  assert.equal(insight?.module, 'reading');
  assert.match(insight!.focus, /Matching headings/);
  assert.match(insight!.evidence[0]!, /2 of 10 correct/);
});

test('a question kind attempted too few times is not a pattern', () => {
  const insight = buildInsight({
    readingBand: 5.5,
    writingBand: null,
    criteria: null,
    kindAccuracy: [
      { kind: 'matching_headings', correct: 0, total: 2, accuracy: 0 },
    ],
  });
  assert.equal(insight, null);
});

test('nothing measured yields nothing rather than an invented weakness', () => {
  assert.equal(
    buildInsight({
      readingBand: null,
      writingBand: null,
      criteria: null,
      kindAccuracy: [],
    }),
    null,
  );
});

test('falls back to the other module when the weaker one has no detail', () => {
  const insight = buildInsight({
    readingBand: 5.5,
    writingBand: 7,
    criteria: CRITERIA,
    kindAccuracy: [],
  });
  assert.equal(insight?.module, 'writing');
});
