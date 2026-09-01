import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AWARD_CATALOGUE,
  awardsEarned,
  currentStreak,
  longestStreak,
} from './awards.ts';

/** `n` consecutive ISO days starting at `from`. */
function run(from: string, n: number): string[] {
  const start = Date.parse(`${from}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) =>
    new Date(start + i * 86_400_000).toISOString().slice(0, 10),
  );
}

const empty = { studyDays: [], lessonsCompleted: 0, diagnosticsCompleted: 0 };

test('an empty log earns nothing', () => {
  assert.deepEqual(awardsEarned(empty), []);
  assert.equal(longestStreak([]), 0);
  assert.equal(currentStreak([], '2026-09-01'), 0);
});

test('a single day is a streak of one', () => {
  assert.equal(longestStreak(['2026-09-01']), 1);
  assert.equal(currentStreak(['2026-09-01'], '2026-09-01'), 1);
});

test('a gap resets the run', () => {
  const days = ['2026-09-01', '2026-09-02', '2026-09-04', '2026-09-05'];
  assert.equal(longestStreak(days), 2);
});

test('the longest streak survives a later gap — an award cannot be un-earned', () => {
  const days = [...run('2026-09-01', 7), '2026-09-20'];
  assert.equal(longestStreak(days), 7);
  // The run is long dead, but the awards it earned still hold.
  const earned = awardsEarned({ ...empty, studyDays: days });
  assert.ok(earned.includes('streak-7'));
  assert.ok(earned.includes('streak-3'));
});

test('streak thresholds are inclusive and do not overshoot', () => {
  const six = { ...empty, studyDays: run('2026-09-01', 6) };
  assert.ok(awardsEarned(six).includes('streak-3'));
  assert.ok(!awardsEarned(six).includes('streak-7'));

  const seven = { ...empty, studyDays: run('2026-09-01', 7) };
  assert.ok(awardsEarned(seven).includes('streak-7'));
  assert.ok(!awardsEarned(seven).includes('streak-14'));
});

test('the current streak tolerates yesterday but not the day before', () => {
  const days = run('2026-09-01', 3); // 01, 02, 03
  assert.equal(currentStreak(days, '2026-09-03'), 3, 'ending today');
  assert.equal(currentStreak(days, '2026-09-04'), 3, 'ending yesterday');
  assert.equal(currentStreak(days, '2026-09-05'), 0, 'two days stale');
});

test('a day ahead of today is a clock disagreement, not a streak', () => {
  assert.equal(currentStreak(['2026-09-10'], '2026-09-01'), 0);
});

test('evidence is order-independent and tolerates duplicates', () => {
  const days = run('2026-09-01', 5);
  const scrambled = [...days].reverse().concat(days[2]!, days[0]!);
  assert.equal(longestStreak(scrambled), longestStreak(days));
  assert.deepEqual(
    awardsEarned({ ...empty, studyDays: scrambled }),
    awardsEarned({ ...empty, studyDays: days }),
  );
});

test('awardsEarned is idempotent — the same log yields the same set', () => {
  const evidence = {
    studyDays: run('2026-09-01', 12),
    lessonsCompleted: 3,
    diagnosticsCompleted: 1,
  };
  assert.deepEqual(awardsEarned(evidence), awardsEarned(evidence));
});

test('day counts are distinct days, not consecutive ones', () => {
  // Ten separate days, never two in a row: the streak ladder gives nothing,
  // the day ladder does. This is the forgiving path existing at all.
  const scattered = Array.from({ length: 10 }, (_, i) =>
    new Date(Date.parse('2026-09-01T00:00:00Z') + i * 2 * 86_400_000)
      .toISOString()
      .slice(0, 10),
  );
  const earned = awardsEarned({ ...empty, studyDays: scattered });
  assert.ok(earned.includes('days-10'));
  assert.ok(!earned.includes('streak-3'));
});

test('firsts fire on the first of each thing', () => {
  assert.deepEqual(awardsEarned({ ...empty, lessonsCompleted: 1 }), [
    'first-lesson',
  ]);
  assert.deepEqual(awardsEarned({ ...empty, diagnosticsCompleted: 1 }), [
    'first-diagnostic',
  ]);
});

test('catalogue ids are unique — they are the ledger primary key', () => {
  const ids = AWARD_CATALOGUE.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
});
