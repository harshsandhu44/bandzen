/**
 * The drift check.
 *
 * The documentation asserts a lot of numbers, and every one of them is a copy
 * of something `apps/app` enforces. A copy that silently stops matching is
 * worse than no documentation: a candidate reads "two essays a week" and the
 * product allows three, and nothing anywhere complains.
 *
 * So this reads the real source AS TEXT and asserts each documented value still
 * appears in it. It does not import: `apps/app` is an app rather than a package,
 * and its modules pull in a database client and a Clerk session that have no
 * business being instantiated by a docs test.
 *
 * The same trick is already in the repo — `apps/admin`'s `import/schemas.test.ts`
 * parses the real files in `apps/app/content/` so a drift fails in CI rather
 * than at an upload.
 *
 * When this fails, `apps/app` is right and `facts.ts` is stale. Fix facts.ts,
 * then read the pages that cite the number.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  AWARDS,
  COACH_MAX_TURNS,
  FREE,
  MIN_ATTEMPTED,
  PLAN_HORIZON_DAYS,
  READING_BANDS,
  REFUND_DAYS,
  TRIAL_DAYS,
  WRITING_CRITERIA,
} from './facts.ts';

const APP = join(import.meta.dirname, '../../../app/src');
const WEB = join(import.meta.dirname, '../../../web/src');

const read = (p: string) => readFileSync(join(APP, p), 'utf8');

const entitlements = read('lib/entitlements.ts');
const awards = read('lib/awards.ts');
const grading = read('lib/grading.ts');
const insight = read('lib/insight.ts');
const studyPlan = read('lib/study-plan.ts');
const coach = read('lib/ai/coach.ts');
const schemas = read('lib/ai/schemas.ts');
const progress = read('app/(app)/progress/page.tsx');
const sections = readFileSync(join(WEB, 'content/sections.ts'), 'utf8');

test('free allowances match entitlements.ts', () => {
  assert.match(
    entitlements,
    new RegExp(`FREE_ESSAYS_PER_WINDOW = ${FREE.essays}\\b`),
  );
  assert.match(
    entitlements,
    new RegExp(`FREE_COACH_MESSAGES_PER_WINDOW = ${FREE.coach}\\b`),
  );
  assert.match(
    entitlements,
    new RegExp(`QUOTA_WINDOW_DAYS = ${FREE.windowDays}\\b`),
  );
  assert.match(entitlements, new RegExp(`TRIAL_DAYS = ${TRIAL_DAYS}\\b`));
});

test('the free band trend depth matches the Progress page', () => {
  assert.match(
    progress,
    new RegExp(`FREE_TREND_POINTS = ${FREE.trendPoints}\\b`),
  );
});

test('every documented award still exists, with the same requirement', () => {
  for (const award of AWARDS) {
    assert.match(awards, new RegExp(`id: '${award.id}'`), award.id);
    assert.match(awards, new RegExp(`name: '${award.name}'`), award.name);
    assert.match(
      awards,
      new RegExp(`requirement: '${award.requirement}'`),
      award.requirement,
    );
  }
});

test('the catalogue has not grown past what the docs list', () => {
  const ids = awards.match(/^\s+id: '/gm) ?? [];
  assert.equal(
    ids.length,
    AWARDS.length,
    `awards.ts holds ${ids.length} awards, the docs list ${AWARDS.length}`,
  );
});

test('the reading conversion table matches readingBand()', () => {
  for (const row of READING_BANDS) {
    if (row.from === 0) continue; // the `return 2.5` fallthrough, not a branch
    const band = Number(row.band);
    // `return 9;` rather than `return 9.0;` — the source drops the trailing zero.
    assert.match(
      grading,
      new RegExp(`scaled >= ${row.from}\\) return ${band};`),
      `raw ${row.from} → band ${row.band}`,
    );
  }
});

test('thresholds cited by the docs still hold', () => {
  assert.match(insight, new RegExp(`MIN_ATTEMPTED = ${MIN_ATTEMPTED}\\b`));
  assert.match(studyPlan, new RegExp(`MAX_DAYS = ${PLAN_HORIZON_DAYS}\\b`));
  assert.match(coach, new RegExp(`MAX_TURNS = ${COACH_MAX_TURNS}\\b`));
  assert.match(sections, new RegExp(`refundDays: ${REFUND_DAYS}\\b`));
});

test('the four writing criteria are still the four', () => {
  for (const criterion of WRITING_CRITERIA) {
    assert.match(schemas, new RegExp(criterion), criterion);
  }
});
