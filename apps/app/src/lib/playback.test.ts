import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describePlayback } from './playback.ts';

test('no playback recorded reads as a clean single-play attempt', () => {
  assert.equal(
    describePlayback(null, 190),
    'played straight through · exam conditions',
  );
});

test('an untouched player reads as clean too', () => {
  assert.equal(
    describePlayback({ pauses: 0, seeks: 0, listenedSeconds: 190 }, 190),
    'played straight through · exam conditions',
  );
});

test('accumulation wobble under the floor is not a replay', () => {
  assert.equal(
    describePlayback({ pauses: 0, seeks: 0, listenedSeconds: 191.4 }, 190),
    'played straight through · exam conditions',
  );
});

test('stopping short is not a replay either', () => {
  assert.equal(
    describePlayback({ pauses: 1, seeks: 0, listenedSeconds: 40 }, 190),
    'paused 1× · not exam conditions',
  );
});

test('a track with no duration says nothing about replay', () => {
  assert.equal(
    describePlayback({ pauses: 0, seeks: 0, listenedSeconds: 280 }, null),
    'played straight through · exam conditions',
  );
});

test('each used control is named, replay shown as a clock', () => {
  assert.equal(
    describePlayback({ pauses: 4, seeks: 2, listenedSeconds: 280 }, 190),
    'paused 4× · seeked 2× · replayed 1:30 · not exam conditions',
  );
});
