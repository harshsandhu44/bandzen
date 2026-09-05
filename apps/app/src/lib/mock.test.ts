import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  listeningSectionSeconds,
  mockPosition,
  trackIndexAtElapsed,
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

test('track index at the very start is the first track, no pause', () => {
  const r = trackIndexAtElapsed(0, [100, 100, 100, 100], 30);
  assert.deepEqual(r, {
    index: 0,
    offsetSeconds: 0,
    inPause: false,
    done: false,
  });
});

test('track index mid-track carries the offset within it', () => {
  const r = trackIndexAtElapsed(40, [100, 100, 100, 100], 30);
  assert.deepEqual(r, {
    index: 0,
    offsetSeconds: 40,
    inPause: false,
    done: false,
  });
});

test('elapsed time lands in the pause between two tracks', () => {
  // Track 0 is 100s; 110s in is 10s into the pause after it.
  const r = trackIndexAtElapsed(110, [100, 100, 100, 100], 30);
  assert.deepEqual(r, {
    index: 1,
    offsetSeconds: 0,
    inPause: true,
    done: false,
  });
});

test('elapsed time past the pause lands into the next track', () => {
  // 100 (track 0) + 30 (pause) + 15 = 15s into track 1.
  const r = trackIndexAtElapsed(145, [100, 100, 100, 100], 30);
  assert.deepEqual(r, {
    index: 1,
    offsetSeconds: 15,
    inPause: false,
    done: false,
  });
});

test('elapsed time past the whole section is done, pinned to the last track', () => {
  const r = trackIndexAtElapsed(10_000, [100, 100, 100, 100], 30);
  assert.deepEqual(r, {
    index: 3,
    offsetSeconds: 0,
    inPause: false,
    done: true,
  });
});

test('the section total is every track plus a pause between each, not after the last', () => {
  assert.equal(listeningSectionSeconds([100, 100, 100, 100], 30), 490);
  assert.equal(
    listeningSectionSeconds([60], 30),
    60,
    'one track has no pause at all',
  );
});
