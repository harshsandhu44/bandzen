import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTurns, peaksFromSamples } from './speech.ts';

test('parseTurns splits a dialogue into per-speaker turns', () => {
  const transcript = 'Maya: Good evening.\n\nLeo: Hi Maya, thanks for having me.';
  assert.deepEqual(parseTurns(transcript), [
    { speaker: 'Maya', text: 'Good evening.' },
    { speaker: 'Leo', text: 'Hi Maya, thanks for having me.' },
  ]);
});

test('parseTurns folds a wrapped line into the previous turn', () => {
  const transcript = 'Maya: Good evening,\neveryone.\n\nLeo: Thanks.';
  assert.deepEqual(parseTurns(transcript), [
    { speaker: 'Maya', text: 'Good evening, everyone.' },
    { speaker: 'Leo', text: 'Thanks.' },
  ]);
});

test('parseTurns on a monologue returns one turn with no speaker', () => {
  const transcript = 'Cities often experience higher temperatures\nthan nearby rural areas.';
  assert.deepEqual(parseTurns(transcript), [
    {
      speaker: null,
      text: 'Cities often experience higher temperatures than nearby rural areas.',
    },
  ]);
});

test('peaksFromSamples normalizes to 0-1 and matches the requested bar count', () => {
  const samples = Array.from({ length: 4800 }, (_, i) =>
    Math.sin((i / 4800) * Math.PI * 20),
  );
  const peaks = peaksFromSamples(samples, 40);

  assert.equal(peaks.length, 40);
  assert.ok(peaks.every((p) => p >= 0 && p <= 1));
  assert.ok(Math.max(...peaks) > 0.99, 'loudest bucket should hit ~1');
});

test('peaksFromSamples on silence returns all zeros, not NaN', () => {
  const peaks = peaksFromSamples(new Array(1000).fill(0), 10);
  assert.equal(peaks.length, 10);
  assert.ok(peaks.every((p) => p === 0));
});

test('peaksFromSamples on empty input returns an empty array', () => {
  assert.deepEqual(peaksFromSamples([], 10), []);
});
