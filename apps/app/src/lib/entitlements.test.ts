import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FREE_COACH_MESSAGES_PER_WINDOW,
  FREE_ESSAYS_PER_WINDOW,
  PLANS,
  allowance,
  canStartDiagnostic,
  canStartMock,
  formatInr,
  grantEndsAt,
  isFoundingActive,
  perMonth,
  planByKey,
  savingsPercent,
} from './entitlements.ts';

const NOW = new Date('2026-09-08T12:00:00Z');
const DAY = 86_400_000;

/** `days` before NOW, so a fixture reads as "how long ago". */
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

const essays = (used: Date[]) =>
  allowance({ isPro: false, used, limit: FREE_ESSAYS_PER_WINDOW, now: NOW });

test('an unused allowance is fully available and has nothing to wait for', () => {
  const a = essays([]);
  assert.equal(a.allowed, true);
  assert.equal(a.used, 0);
  assert.equal(a.remaining, FREE_ESSAYS_PER_WINDOW);
  assert.equal(a.resetsAt, null);
});

test('one below the limit is still allowed', () => {
  const a = essays([ago(1)]);
  assert.equal(a.allowed, true);
  assert.equal(a.remaining, 1);
  assert.equal(a.resetsAt, null, 'a slot is free, so there is nothing to say');
});

test('exactly at the limit blocks, and says when the next slot frees', () => {
  const a = essays([ago(6), ago(1)]);
  assert.equal(a.allowed, false);
  assert.equal(a.used, 2);
  assert.equal(a.remaining, 0);
  // The oldest is six days old, so it ages out one day from now.
  assert.deepEqual(a.resetsAt, new Date(NOW.getTime() + 1 * DAY));
});

test('a use that has aged out of the window does not count', () => {
  // Seven days is the window, so this one is outside it by an hour.
  const a = essays([new Date(NOW.getTime() - 7 * DAY - 3_600_000), ago(1)]);
  assert.equal(a.allowed, true);
  assert.equal(a.used, 1);
});

test('the window boundary is exclusive at exactly seven days', () => {
  const a = essays([new Date(NOW.getTime() - 7 * DAY), ago(1)]);
  assert.equal(a.used, 1, 'a use exactly seven days old has fallen out');
});

test('a race past the limit still names the right slot', () => {
  // Three got through where two are allowed. Two must age out, so the wait is
  // on the second oldest, not the first.
  const a = essays([ago(6), ago(5), ago(1)]);
  assert.equal(a.allowed, false);
  assert.equal(a.remaining, 0);
  assert.deepEqual(a.resetsAt, new Date(NOW.getTime() + 2 * DAY));
});

test('order of the input does not matter', () => {
  const a = essays([ago(1), ago(6)]);
  assert.deepEqual(a.resetsAt, new Date(NOW.getTime() + 1 * DAY));
});

test('Pro is unlimited and never reports a wait', () => {
  const a = allowance({
    isPro: true,
    used: [ago(1), ago(2), ago(3)],
    limit: FREE_ESSAYS_PER_WINDOW,
    now: NOW,
  });
  assert.equal(a.allowed, true);
  assert.equal(a.unlimited, true);
  assert.equal(a.resetsAt, null);
});

test('Coach runs on the same rule with its own limit', () => {
  const used = Array.from({ length: FREE_COACH_MESSAGES_PER_WINDOW }, () =>
    ago(2),
  );
  const a = allowance({
    isPro: false,
    used,
    limit: FREE_COACH_MESSAGES_PER_WINDOW,
    now: NOW,
  });
  assert.equal(a.allowed, false);
  assert.deepEqual(a.resetsAt, new Date(NOW.getTime() + 5 * DAY));
});

test('the first diagnostic is free, the second is not', () => {
  assert.equal(canStartDiagnostic({ isPro: false, taken: 0 }), true);
  assert.equal(canStartDiagnostic({ isPro: false, taken: 1 }), false);
  assert.equal(canStartDiagnostic({ isPro: true, taken: 3 }), true);
});

test('Free cannot start a mock at all, however few they have used', () => {
  const a = canStartMock({ isPro: false, startsInWindow: [], now: NOW });
  assert.equal(a.allowed, false);
  assert.equal(a.resetsAt, null);
});

test('Pro gets one mock a week, not unlimited', () => {
  const fresh = canStartMock({ isPro: true, startsInWindow: [], now: NOW });
  assert.equal(fresh.allowed, true);
  assert.equal(fresh.unlimited, false);

  const used = canStartMock({
    isPro: true,
    startsInWindow: [ago(1)],
    now: NOW,
  });
  assert.equal(used.allowed, false);
  assert.deepEqual(used.resetsAt, new Date(NOW.getTime() + 6 * DAY));
});

test('a Pro mock start that has aged out of the window frees up again', () => {
  const a = canStartMock({
    isPro: true,
    startsInWindow: [ago(8)],
    now: NOW,
  });
  assert.equal(a.allowed, true);
});

test('a grant expires the given number of days out', () => {
  assert.deepEqual(grantEndsAt(7, NOW), new Date(NOW.getTime() + 7 * DAY));
});

test('the founding window is closed when no date is set', () => {
  assert.equal(isFoundingActive(null, NOW), false);
  assert.equal(isFoundingActive(undefined, NOW), false);
});

test('the founding window closes on its date, not after it', () => {
  assert.equal(isFoundingActive(new Date(NOW.getTime() + 1000), NOW), true);
  assert.equal(isFoundingActive(NOW, NOW), false);
});

test('quarterly is cheaper per month than monthly, at both prices', () => {
  const [monthly, quarterly] = PLANS;
  assert.ok(perMonth(quarterly, true) < perMonth(monthly, true));
  assert.ok(perMonth(quarterly, false) < perMonth(monthly, false));
});

test('the advertised saving matches the arithmetic', () => {
  const quarterly = planByKey('quarterly')!;
  // ₹2,999 against three months at ₹1,499 = ₹4,497.
  assert.equal(savingsPercent(quarterly, false), 33);
  assert.equal(savingsPercent(planByKey('monthly')!, false), 0);
});

test('prices render as whole rupees in Indian digit grouping', () => {
  assert.equal(formatInr(79_900), '₹799');
  assert.equal(formatInr(199_900), '₹1,999');
});
