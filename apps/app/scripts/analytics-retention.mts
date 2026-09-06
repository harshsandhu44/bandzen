import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

import { neon } from '@neondatabase/serverless';

/**
 * Read-only. "Are candidates coming back?" — the habit question the activation
 * funnel (PR #57) does not answer. Four sections printed as tables:
 *
 *   A. Recency — who is active / at-risk / churned, and what kind of activity
 *      they did in the last 7 days.
 *   B. Return-after-first-week — the headline habit number, by onboarding week.
 *   C. Abandoned / failed attempts — broken value moments.
 *   D. Content-quality rollup — worst question kinds, most common weaknesses.
 *
 * Anchored on `profiles.onboarding_completed_at`: someone who signed up but
 * never onboarded is an activation problem, not a retention one.
 *
 * Day maths is UTC. Per-candidate timezones are not worth it at this scale —
 * a boundary being a few hours off changes no bucket that matters.
 *
 * Run: pnpm --filter @bandzen/app analytics:retention
 */

const sql = neon(process.env.DATABASE_URL!);

// Activity = a completed unit of work. Practice attempts, finished lessons and
// coach messages are the three plain sources; mock/diagnostic sections are the
// section `attempts` rows (mock_attempt_id not null), kept separate so they
// never double-count against practice. `mock_attempts.submitted_at` is NOT a
// source — it is stamped only when the last section submits, so a candidate
// mid-mock would read as inactive.
const activityCte = `
  activity as (
    select user_id, submitted_at as at,
           case when mock_attempt_id is null then 'practice' else 'mock_section' end as kind
      from attempts
     where submitted_at is not null
    union all
    select user_id, completed_at as at, 'lesson' as kind from lesson_progress
    union all
    select user_id, created_at as at, 'coach' as kind from coach_messages
  )
`;

async function sectionA() {
  const rows = await sql`
    with ${sql.unsafe(activityCte)},
    cand as (
      select user_id, onboarding_completed_at as onboarded, test_date
        from profiles
       where onboarding_completed_at is not null
    ),
    agg as (
      select c.user_id,
             c.onboarded::date::text as onboarded,
             c.test_date,
             max(a.at) as last_activity,
             count(*) filter (where a.at::date > c.onboarded::date) as post_onboard_events,
             count(*) filter (where a.kind = 'practice'     and a.at > now() - interval '7 days') as practice_7d,
             count(*) filter (where a.kind = 'lesson'       and a.at > now() - interval '7 days') as lesson_7d,
             count(*) filter (where a.kind = 'coach'        and a.at > now() - interval '7 days') as coach_7d,
             count(*) filter (where a.kind = 'mock_section' and a.at > now() - interval '7 days') as mock_7d,
             count(*) filter (where a.kind = 'practice')     as practice_all,
             count(*) filter (where a.kind = 'lesson')       as lesson_all,
             count(*) filter (where a.kind = 'coach')        as coach_all,
             count(*) filter (where a.kind = 'mock_section') as mock_all
        from cand c
        left join activity a on a.user_id = c.user_id
       group by c.user_id, c.onboarded, c.test_date
    )
    select user_id,
           onboarded,
           test_date::text as test_date,
           case when test_date is not null
                then (test_date - current_date) end as days_to_test,
           last_activity,
           case when last_activity is null then null
                else floor(extract(epoch from now() - last_activity) / 86400)::int end as days_since,
           case
             when post_onboard_events = 0 then 'never_returned'
             when test_date is not null and test_date < current_date then 'done'
             when last_activity > now() - interval '8 days'  then 'active'
             when last_activity > now() - interval '15 days' then 'at_risk'
             else 'churned'
           end as bucket,
           practice_7d, lesson_7d, coach_7d, mock_7d,
           practice_all, lesson_all, coach_all, mock_all
      from agg
     order by days_since desc nulls first
  `;
  console.log('\n=== A. Recency (order: most stale first) ===');
  console.table(rows);
}

async function sectionB() {
  const rows = await sql`
    with ${sql.unsafe(activityCte)},
    cand as (
      select user_id, onboarding_completed_at as onboarded
        from profiles
       where onboarding_completed_at is not null
    ),
    flagged as (
      select c.user_id,
             date_trunc('week', c.onboarded)::date::text as cohort_week,
             exists (
               select 1 from activity a
                where a.user_id = c.user_id
                  and a.at >= c.onboarded + interval '7 days'
                  and a.at <  c.onboarded + interval '14 days'
             ) as returned_w2
        from cand c
    )
    select cohort_week,
           count(*) as n,
           count(*) filter (where returned_w2) as returned_w2,
           round(100.0 * count(*) filter (where returned_w2) / count(*), 1) as pct
      from flagged
     group by cohort_week
     order by cohort_week
  `;
  console.log('\n=== B. Returned in week 2 (day 8-14 after onboarding) ===');
  console.table(rows);

  const [pooled] = await sql`
    with ${sql.unsafe(activityCte)},
    cand as (
      select user_id, onboarding_completed_at as onboarded
        from profiles where onboarding_completed_at is not null
    ),
    flagged as (
      select c.user_id,
             exists (
               select 1 from activity a
                where a.user_id = c.user_id
                  and a.at >= c.onboarded + interval '7 days'
                  and a.at <  c.onboarded + interval '14 days'
             ) as returned_w2
        from cand c
    )
    select count(*) as n,
           count(*) filter (where returned_w2) as returned_w2,
           round(100.0 * count(*) filter (where returned_w2) / nullif(count(*), 0), 1) as pct
      from flagged
  `;
  console.log(`Pooled: ${pooled.returned_w2}/${pooled.n} = ${pooled.pct}% returned in week 2`);
}

async function sectionC() {
  const perUser = await sql`
    select user_id,
           count(*) as stuck,
           max(floor(extract(epoch from now() - started_at) / 86400))::int as oldest_days
      from attempts
     where status in ('in_progress', 'failed')
     group by user_id
     order by stuck desc
  `;
  console.log('\n=== C. Abandoned / failed attempts — per candidate ===');
  console.table(perUser);

  const totals = await sql`
    select module, status, count(*) as n
      from attempts
     where status in ('in_progress', 'failed')
     group by module, status
     order by n desc
  `;
  console.log('--- totals by module / status ---');
  console.table(totals);
}

async function sectionD() {
  // Correctness mirrors isAnswerCorrect (grading.ts): case-insensitive,
  // whitespace-trimmed match against any accepted form in the jsonb answer key.
  const accuracy = await sql`
    select a.module,
           q.kind,
           count(*) as attempted,
           round(100.0 * count(*) filter (where exists (
             select 1 from jsonb_array_elements_text(qa.answer) k
              where lower(btrim(k)) = lower(btrim(aa.value))
           )) / count(*), 1) as pct_correct
      from attempt_answers aa
      join attempts a        on a.id = aa.attempt_id and a.status = 'complete'
      join questions q       on q.id = aa.question_id
      join question_answers qa on qa.question_id = q.id
     where aa.value is not null and btrim(aa.value) <> ''
     group by a.module, q.kind
    having count(*) >= 20
     order by pct_correct asc
  `;
  console.log('\n=== D. Accuracy by question kind (worst first, n>=20) ===');
  console.table(accuracy);

  const weaknesses = await sql`
    select w, count(*) as n
      from reports, jsonb_array_elements_text(weaknesses) w
     group by w
     order by n desc
     limit 10
  `;
  console.log('--- top 10 weakness strings from AI reports ---');
  console.table(weaknesses);
}

await sectionA();
await sectionB();
await sectionC();
await sectionD();

process.exit(0);
