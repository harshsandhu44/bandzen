/**
 * The drift check.
 *
 * The documentation asserts a lot of numbers and a fact about which modules
 * exist, and most of it is a copy of something `apps/app` enforces. A copy
 * that silently stops matching is worse than no documentation: a candidate
 * reads "two essays a week" and the product allows three, and nothing
 * anywhere complains — or reads "Speaking is not built" a day after it ships,
 * which is exactly what happened here.
 *
 * So this reads the real source AS TEXT and asserts each documented value still
 * appears in it. It does not import: `apps/app` is an app rather than a package,
 * and its modules pull in a database client and a Clerk session that have no
 * business being instantiated by a docs test. (The writing/speaking criteria
 * are the one exception — see `facts.ts` — because they live in `@bandzen/ai`,
 * a real package, and are imported there instead of copied.)
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
  MODULES_WITH_ENGINE,
  PLAN_HORIZON_DAYS,
  READING_BANDS,
  REFUND_DAYS,
  TRIAL_DAYS,
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
const modules = read('lib/modules.ts');
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

// The writing/speaking criteria no longer need a test here — facts.ts imports
// them from @bandzen/ai/schemas, so drift there is a type error, not a
// silent copy going stale.

test('the modules with an engine are still exactly the documented four', () => {
  // Anchored to the declaration itself, not the whole file: IELTS_MODULES two
  // lines above also lists all four, and would make a whole-file count pass
  // even if AVAILABLE_MODULES regressed to two.
  const match = modules.match(
    /AVAILABLE_MODULES: readonly Skill\[\] = \[([\s\S]*?)\];/,
  );
  assert.ok(match, 'AVAILABLE_MODULES declaration not found');
  const listed = [...match[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);
  assert.deepEqual(
    [...listed].sort(),
    [...MODULES_WITH_ENGINE].sort(),
    'a module gained or lost an engine — update facts.ts, then the pages that describe it',
  );
});

test('no module has a stated reason to be unavailable', () => {
  assert.match(
    modules,
    /UNAVAILABLE_REASON: Record<string, string> = \{\};/,
    'a module now has a lock reason — the locked callout and "what is not built" copy need it',
  );
});
