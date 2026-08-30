import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAnswerCorrect, readingBand } from './grading.ts';

test('a perfect full-length paper is band 9', () => {
  assert.equal(readingBand(40, 40), 9);
});

test('a 13-question set scales onto the 40-question band table', () => {
  // 12/13 ≈ 37/40, which is band 8.5 on the public table.
  assert.equal(readingBand(12, 13), 8.5);
  // 9/13 ≈ 28/40 → 6.5
  assert.equal(readingBand(9, 13), 6.5);
});

test('band boundaries land on the right side', () => {
  assert.equal(readingBand(30, 40), 7);
  assert.equal(readingBand(29, 40), 6.5);
  assert.equal(readingBand(23, 40), 6);
  assert.equal(readingBand(22, 40), 5.5);
});

test('zero correct does not go below the floor', () => {
  assert.equal(readingBand(0, 40), 2.5);
});

test('an empty paper does not divide by zero', () => {
  assert.equal(readingBand(0, 0), 0);
});

test('answers match ignoring case and surrounding space', () => {
  assert.ok(isAnswerCorrect(['TRUE'], '  true '));
  assert.ok(isAnswerCorrect(['NOT GIVEN'], 'Not Given'));
});

test('a key may accept more than one form', () => {
  assert.ok(isAnswerCorrect(['cotton', 'raw cotton'], 'Raw Cotton'));
  assert.ok(isAnswerCorrect(['cotton', 'raw cotton'], 'cotton'));
});

test('blank, whitespace and missing answers are all wrong, not accidentally right', () => {
  assert.equal(isAnswerCorrect(['TRUE'], null), false);
  assert.equal(isAnswerCorrect(['TRUE'], undefined), false);
  assert.equal(isAnswerCorrect(['TRUE'], ''), false);
  assert.equal(isAnswerCorrect(['TRUE'], '   '), false);
});

test('a wrong answer is wrong', () => {
  assert.equal(isAnswerCorrect(['TRUE'], 'FALSE'), false);
  assert.equal(isAnswerCorrect(['cotton'], 'wool'), false);
});
