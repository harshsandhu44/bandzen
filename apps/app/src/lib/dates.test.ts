import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { daysUntil, todayIso } from './dates.ts';

/**
 * 18:55 UTC on 31 August is already 00:25 on 1 September in Kolkata. Every
 * assertion below is pinned to that instant, because the bug this file exists
 * to catch only exists between a zone's midnight and UTC's.
 */
const STRADDLING_MIDNIGHT = new Date('2026-08-31T18:55:00Z');

const atThatInstant = (fn: () => void) => {
  mock.timers.enable({ apis: ['Date'], now: STRADDLING_MIDNIGHT });
  try {
    fn();
  } finally {
    mock.timers.reset();
  }
};

test('today is the candidate’s day, not UTC’s', () => {
  atThatInstant(() => {
    assert.equal(todayIso('Asia/Kolkata'), '2026-09-01');
    assert.equal(todayIso(), '2026-08-31');
  });
});

test('the countdown counts from the candidate’s today', () => {
  atThatInstant(() => {
    // The header and the sidebar both render this, and both must say 56.
    assert.equal(daysUntil('2026-10-27', 'Asia/Kolkata'), 56);
    assert.equal(daysUntil('2026-10-27'), 57);
  });
});

test('an unknown zone falls back rather than throwing', () => {
  atThatInstant(() => {
    assert.equal(daysUntil('2026-10-27', 'Mars/Olympus_Mons'), 57);
    assert.equal(daysUntil('2026-10-27', null), 57);
  });
});

test('the day of the test is zero, and the day after is negative', () => {
  atThatInstant(() => {
    assert.equal(daysUntil('2026-09-01', 'Asia/Kolkata'), 0);
    assert.equal(daysUntil('2026-08-31', 'Asia/Kolkata'), -1);
  });
});
