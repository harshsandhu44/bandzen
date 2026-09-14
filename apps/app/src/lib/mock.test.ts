import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  listeningSectionSeconds,
  mockPosition,
  type MockChild,
} from './mock.ts';

test('a fresh sitting with no rows at all starts at Listening', () => {
  assert.equal(mockPosition([]), 'listening');
});

test('a section with no row yet is not reached', () => {
  assert.equal(
    mockPosition([{ module: 'listening', status: 'complete' }]),
    'reading',
  );
});

test('an in-progress section is the current position, even mid-sitting', () => {
  assert.equal(
    mockPosition([
      { module: 'listening', status: 'complete' },
      { module: 'reading', status: 'in_progress' },
    ]),
    'reading',
  );
});

test('writing needs both rows submitted before moving on', () => {
  const oneSubmitted: MockChild[] = [
    { module: 'listening', status: 'complete' },
    { module: 'reading', status: 'complete' },
    { module: 'writing', status: 'grading' },
    { module: 'writing', status: 'in_progress' },
  ];
  assert.equal(mockPosition(oneSubmitted), 'writing');

  const bothSubmitted: MockChild[] = [
    { module: 'listening', status: 'complete' },
    { module: 'reading', status: 'complete' },
    { module: 'writing', status: 'grading' },
    { module: 'writing', status: 'complete' },
  ];
  assert.equal(mockPosition(bothSubmitted), 'speaking');
});

test('grading in the background does not block progress -- only in_progress does', () => {
  assert.equal(
    mockPosition([{ module: 'listening', status: 'grading' }]),
    'reading',
  );
  assert.equal(
    mockPosition([{ module: 'listening', status: 'failed' }]),
    'reading',
  );
});

test('all four sections submitted is the end of the sitting', () => {
  assert.equal(
    mockPosition([
      { module: 'listening', status: 'complete' },
      { module: 'reading', status: 'complete' },
      { module: 'writing', status: 'complete' },
      { module: 'writing', status: 'complete' },
      { module: 'speaking', status: 'grading' },
    ]),
    null,
  );
});

test('every sitting continues into Speaking after Writing closes', () => {
  const throughWriting = [
    { module: 'listening', status: 'complete' },
    { module: 'reading', status: 'complete' },
    { module: 'writing', status: 'complete' },
  ] as const;
  assert.equal(mockPosition(throughWriting), 'speaking');
});

test('the section total is every track plus a pause between each, not after the last', () => {
  assert.equal(listeningSectionSeconds([100, 100, 100, 100], 30), 490);
  assert.equal(
    listeningSectionSeconds([60], 30),
    60,
    'one track has no pause at all',
  );
});
