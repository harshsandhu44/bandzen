import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

import { neon } from '@neondatabase/serverless';
import { awardsEarned } from '../src/lib/awards.ts';

/**
 * Grant every existing candidate the awards their history already justifies.
 *
 * Awards are evaluated in the write paths, so without this the beta cohort
 * earns nothing until their next attempt — and then earns eight things at once
 * for work they did in July.
 *
 * Every row is written with `notified_at` set, so nobody opens the app to a
 * strip celebrating a streak they finished a month ago. New awards from here
 * on arrive unnotified and announce themselves normally.
 *
 * Idempotent, in two ways: `ON CONFLICT DO NOTHING` on the composite key, and
 * `awardsEarned` reading the whole log rather than a delta. Dry run by default;
 * pass --apply to write.
 */

const apply = process.argv.includes('--apply');
const sql = neon(process.env.DATABASE_URL!);

const profiles = (await sql`
  SELECT user_id, timezone FROM profiles
`) as { user_id: string; timezone: string | null }[];

let granted = 0;

for (const { user_id: userId, timezone } of profiles) {
  const zone = timezone ?? 'UTC';

  // Deliberately the same union as `studyDays` in queries.ts. If one changes,
  // the other has to, or a backfilled streak disagrees with a live one.
  const days = (await sql`
    SELECT DISTINCT day FROM (
      SELECT to_char(submitted_at AT TIME ZONE ${zone}, 'YYYY-MM-DD') AS day
        FROM attempts
       WHERE user_id = ${userId} AND status = 'complete' AND submitted_at IS NOT NULL
      UNION
      SELECT to_char(completed_at AT TIME ZONE ${zone}, 'YYYY-MM-DD')
        FROM lesson_progress WHERE user_id = ${userId}
    ) d ORDER BY day
  `) as { day: string }[];

  const [counts] = (await sql`
    SELECT
      (SELECT count(*)::int FROM lesson_progress WHERE user_id = ${userId}) AS lessons,
      (SELECT count(*)::int FROM attempts
        WHERE user_id = ${userId} AND kind = 'diagnostic'
          AND module = 'reading' AND status = 'complete') AS diagnostics
  `) as [{ lessons: number; diagnostics: number }];

  const earned = awardsEarned({
    studyDays: days.map((d) => d.day),
    lessonsCompleted: counts.lessons,
    diagnosticsCompleted: counts.diagnostics,
  });
  if (!earned.length) continue;

  console.log(`${userId} · ${earned.join(', ')}`);
  granted += earned.length;

  if (apply) {
    for (const awardId of earned) {
      await sql`
        INSERT INTO awards (user_id, award_id, notified_at)
        VALUES (${userId}, ${awardId}, now())
        ON CONFLICT DO NOTHING
      `;
    }
  }
}

console.log(
  `\n${profiles.length} candidates · ${granted} awards ${apply ? 'written' : 'would be written'}`,
);
if (!apply) console.log('Dry run. Pass --apply to write.');
