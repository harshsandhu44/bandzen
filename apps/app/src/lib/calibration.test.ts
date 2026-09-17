import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bandOf,
  calibrate,
  gateFailures,
  type CalibrationPair,
} from './calibration.ts';

const pair = (
  estimate: number | null,
  official: number,
  over: Partial<CalibrationPair> = {},
): CalibrationPair => ({
  scoringVersion: 'v2',
  examVersion: '2025',
  estimate: { overall: estimate, subscores: { reading: 60, listening: null } },
  official: { overall: official, skills: { reading: 58, listening: 70 } },
  taskTypes: ['read_aloud'],
  ...over,
});

test('signed error is estimate minus official', () => {
  const [g] = calibrate([pair(62, 60), pair(55, 60)]);
  assert.deepEqual(g!.overall, { n: 2, mae: 3.5, bias: -1.5 });
});

test('skills pair only where both sides have a score', () => {
  const [g] = calibrate([pair(62, 60)]);
  assert.deepEqual(g!.skills, { reading: { n: 1, mae: 2, bias: 2 } });
});

test('bands, task types and missing skills', () => {
  const [g] = calibrate([pair(62, 60), pair(49, 45)]);
  assert.deepEqual(Object.keys(g!.bands), ['40–49', '60–69']);
  assert.equal(g!.taskTypes.read_aloud!.n, 2);
  assert.deepEqual(Object.keys(g!.missingSkills), ['listening']);
  assert.equal(bandOf(90), '90–99');
});

test('groups by scoring and exam version, and skips a missing overall', () => {
  const groups = calibrate([
    pair(62, 60),
    pair(62, 60, { scoringVersion: 'v1' }),
    pair(null, 60),
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0]!.overall.n, 1);
  assert.equal(groups[0]!.skills.reading!.n, 2);
});

test('gate needs enough pairs, a low MAE and no biased band', () => {
  const good = calibrate(Array.from({ length: 30 }, () => pair(61, 60)))[0]!;
  assert.deepEqual(gateFailures(good), []);
  assert.deepEqual(gateFailures(calibrate([pair(61, 60)])[0]!), [
    '1 of 30 pairs',
  ]);
  const biased = calibrate(Array.from({ length: 30 }, () => pair(64, 60)))[0]!;
  assert.deepEqual(gateFailures(biased), [
    'overall MAE 4 > 3',
    'band 60–69 bias 4 beyond ±2',
  ]);
});
