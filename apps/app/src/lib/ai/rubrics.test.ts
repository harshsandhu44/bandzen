import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WRITING_RUBRIC } from './rubric.ts';
import { rubricFor } from './rubrics.ts';
import { SPEAKING_RUBRIC } from './speaking-rubric.ts';
import { pteRubricFor } from './pte-rubrics.ts';

test('IELTS productive tasks grade against their own rubrics', () => {
  assert.equal(rubricFor('ielts', 'writing'), WRITING_RUBRIC);
  assert.equal(rubricFor('ielts', 'speaking'), SPEAKING_RUBRIC);
});

test('PTE productive tasks grade against their own task rubric, not IELTS bands', () => {
  assert.throws(
    () => rubricFor('pte_academic', 'writing'),
    /No writing rubric/,
  );
  assert.doesNotMatch(pteRubricFor('write_essay'), /Band/);
});

test('an exam without a rubric is refused, not graded as IELTS', () => {
  assert.throws(() => rubricFor('toefl_ibt', 'writing'), /No writing rubric/);
  assert.throws(() => rubricFor('det', 'speaking'), /No speaking rubric/);
});
