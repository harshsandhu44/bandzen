import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPlan, nextAction } from './study-plan.ts';

const TODAY = new Date('2026-09-01T10:00:00Z');

test('plan stops at the test date', () => {
  const plan = buildPlan({
    readingBand: 7,
    writingBand: 6,
    targetBand: 8,
    testDate: '2026-09-06',
    today: TODAY,
  });
  assert.equal(plan.length, 5);
  assert.equal(plan.at(-1)?.date, '2026-09-06');
});

test('a test date in the past yields no tasks rather than negative days', () => {
  const plan = buildPlan({
    readingBand: 7,
    writingBand: 6,
    targetBand: 8,
    testDate: '2026-08-01',
    today: TODAY,
  });
  assert.deepEqual(plan, []);
});

test('no test date runs a fortnight', () => {
  const plan = buildPlan({
    readingBand: 7,
    writingBand: 6,
    targetBand: 8,
    testDate: null,
    today: TODAY,
  });
  assert.equal(plan.length, 14);
});

test('a clear gap skews two days in three to the weaker skill', () => {
  const plan = buildPlan({
    readingBand: 8,
    writingBand: 6,
    targetBand: 8,
    testDate: null,
    today: TODAY,
  });
  const writing = plan.filter((t) => t.skill === 'writing').length;
  assert.equal(writing, 10, 'expected 10 of 14 days on the weaker skill');
  assert.equal(plan.length - writing, 4);
});

test('bands within half a band alternate evenly', () => {
  const plan = buildPlan({
    readingBand: 6.5,
    writingBand: 6,
    targetBand: 8,
    testDate: null,
    today: TODAY,
  });
  const writing = plan.filter((t) => t.skill === 'writing').length;
  assert.equal(writing, 7);
});

test('the first writing task names the reported weakness', () => {
  const plan = buildPlan({
    readingBand: 8,
    writingBand: 6,
    targetBand: 8,
    testDate: null,
    today: TODAY,
    weaknesses: ['paragraphs assert without supporting'],
  });
  const firstWriting = plan.find((t) => t.skill === 'writing');
  assert.match(firstWriting!.label, /paragraphs assert without supporting/);
  // ...and only the first one, so the plan does not nag.
  const tagged = plan.filter((t) => t.label.includes('focus:')).length;
  assert.equal(tagged, 1);
});

test('nextAction reports no estimate before any attempt', () => {
  const line = nextAction({
    readingBand: null,
    writingBand: null,
    targetBand: 8,
    testDate: null,
  });
  assert.match(line, /diagnostic/i);
});

test('nextAction names the weaker skill', () => {
  const line = nextAction({
    readingBand: 8,
    writingBand: 6,
    targetBand: 8,
    testDate: null,
  });
  assert.match(line, /^Writing/);
});
