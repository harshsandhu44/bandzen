import assert from 'node:assert/strict';
import test from 'node:test';
import { peaksFromSamples } from './speech.ts';

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
