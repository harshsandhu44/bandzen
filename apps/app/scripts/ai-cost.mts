import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

import { neon } from '@neondatabase/serverless';
import { PRICING_VERSION } from '@bandzen/ai/runtime/pricing';

/**
 * Read-only. "What is the AI costing us, and who is spending it?" — the
 * question #60 built `ai_usage` to answer. Five sections:
 *
 *   A. Spend and volume by feature.
 *   B. Spend by model, with latency and cache hit.
 *   C. Cost per unit of work — per graded submission, per coach turn.
 *   D. Cost per active candidate, Free vs Pro.
 *   E. Blind spots — what this report cannot see, and how big it is.
 *
 * Section E is not a footnote. Two known holes make every number above it an
 * understatement, and a cost report that hides its own error bars is worse
 * than no report:
 *
 *   - An aborted Coach stream never yields a usage chunk, so its row carries
 *     no tokens and no cost. Real spend, invisible.
 *   - A model absent from the price table produces a null cost rather than a
 *     NaN that would poison every SUM. Also real spend, also invisible.
 *
 * Costs are estimates stamped with the price sheet that produced them. Rows
 * written under an older `pricing_version` were priced under different numbers
 * and are not silently re-priced here.
 *
 * Window defaults to 30 days: `pnpm --filter @bandzen/app analytics:ai-cost`
 * Override with `--days 90`.
 */

const sql = neon(process.env.DATABASE_URL!);

const i = process.argv.indexOf('--days');
const DAYS = i === -1 ? 30 : Number(process.argv[i + 1]);
const since = `${DAYS} days`;

async function sectionA() {
  const rows = await sql`
    select feature,
           count(*) as calls,
           count(*) filter (where status = 'failed') as failed,
           sum(input_tokens)  as input_tokens,
           sum(output_tokens) as output_tokens,
           round(sum(estimated_cost_usd)::numeric, 4) as cost_usd,
           count(*) filter (where estimated_cost_usd is null) as unpriced
      from ai_usage
     where created_at > now() - ${since}::interval
     group by feature
     order by sum(estimated_cost_usd) desc nulls last
  `;
  console.log(`\n=== A. Spend by feature (last ${DAYS} days) ===`);
  console.table(rows);
}

async function sectionB() {
  const rows = await sql`
    select model,
           count(*) as calls,
           round(sum(estimated_cost_usd)::numeric, 4) as cost_usd,
           percentile_cont(0.5) within group (order by latency_ms)::int as p50_ms,
           percentile_cont(0.95) within group (order by latency_ms)::int as p95_ms,
           case when sum(input_tokens) = 0 then null
                else round(100.0 * sum(cached_input_tokens) / sum(input_tokens), 1)
           end as cache_hit_pct,
           sum(reasoning_tokens) as reasoning_tokens
      from ai_usage
     where created_at > now() - ${since}::interval
     group by model
     order by sum(estimated_cost_usd) desc nulls last
  `;
  console.log(`\n=== B. By model — latency, cache, reasoning ===`);
  console.table(rows);
}

/**
 * Grouped by attempt, not by row. One speaking grade writes a
 * `speaking_grader` row plus one `transcribe` row per clip — up to ten — so a
 * per-row average would report the transcripts as the typical AI call and make
 * a submission look an order of magnitude cheaper than it is.
 */
async function sectionC() {
  const perSubmission = await sql`
    select a.module,
           count(distinct u.attempt_id) as submissions,
           round(avg(per_attempt.cost)::numeric, 4) as avg_cost_usd,
           round(max(per_attempt.cost)::numeric, 4) as max_cost_usd
      from (
        select attempt_id, sum(estimated_cost_usd) as cost
          from ai_usage
         where attempt_id is not null
           and created_at > now() - ${since}::interval
         group by attempt_id
      ) per_attempt
      join ai_usage u on u.attempt_id = per_attempt.attempt_id
      join attempts a on a.id = per_attempt.attempt_id
     group by a.module
     order by a.module
  `;
  console.log(
    '\n=== C1. Cost per graded submission (all rows for the attempt) ===',
  );
  console.table(perSubmission);

  const perTurn = await sql`
    select feature,
           count(*) as turns,
           round(avg(estimated_cost_usd)::numeric, 5) as avg_cost_usd
      from ai_usage
     where feature in ('coach', 'tutor')
       and created_at > now() - ${since}::interval
     group by feature
  `;
  console.log('--- cost per Coach / Tutor turn ---');
  console.table(perTurn);
}

/**
 * Only candidate-attributable spend counts here.
 *
 * `content_generator` and `transcribe`-from-the-CMS carry an admin's Clerk id
 * or no id at all; counting either would bill the catalogue to whichever
 * teammate generated it and drop it in the Free bucket, which would make this
 * table wrong while looking right.
 *
 * Pro is the same rule the app uses — `isProAt`: a subscription row whose
 * period end is still in the future, regardless of Polar status, because a
 * founding grant is a row with a future end and no Polar id.
 */
async function sectionD() {
  const rows = await sql`
    with attributable as (
      select coalesce(u.user_id, a.user_id) as user_id,
             u.estimated_cost_usd as cost
        from ai_usage u
        left join attempts a on a.id = u.attempt_id
       where u.feature in ('writing_grader', 'speaking_grader', 'coach', 'tutor')
         and u.created_at > now() - ${since}::interval
    ),
    per_user as (
      select user_id, sum(cost) as cost
        from attributable
       where user_id is not null
       group by user_id
    )
    select case when s.current_period_end > now() then 'pro' else 'free' end as plan,
           count(*) as candidates,
           round(sum(p.cost)::numeric, 4) as total_usd,
           round(avg(p.cost)::numeric, 4) as avg_usd,
           round(max(p.cost)::numeric, 4) as max_usd
      from per_user p
      left join subscriptions s on s.user_id = p.user_id
     group by 1
     order by 1
  `;
  console.log(`\n=== D. Cost per active candidate, Free vs Pro ===`);
  console.table(rows);
  console.log(
    '    Excludes content_generator and CMS transcription — catalogue spend is\n' +
      '    not attributable to a candidate.',
  );
}

async function sectionE() {
  const rows = await sql`
    select count(*) as total_calls,
           count(*) filter (where error_code = 'aborted') as aborted_coach_streams,
           count(*) filter (where estimated_cost_usd is null and status = 'ok') as priced_null,
           count(distinct model) filter (where estimated_cost_usd is null and status = 'ok') as unpriced_models,
           count(distinct pricing_version) as pricing_versions
      from ai_usage
     where created_at > now() - ${since}::interval
  `;
  console.log('\n=== E. Blind spots ===');
  console.table(rows);

  const unpriced = await sql`
    select model, count(*) as calls
      from ai_usage
     where estimated_cost_usd is null and status = 'ok'
       and created_at > now() - ${since}::interval
     group by model
     order by calls desc
  `;
  if (unpriced.length) {
    console.log(
      '--- models with no entry in the price table (cost unknown) ---',
    );
    console.table(unpriced);
  }
  console.log(
    `    Every figure above is an UNDERSTATEMENT by the spend behind these rows.\n` +
      `    Current price sheet: ${PRICING_VERSION}.`,
  );
}

const [{ n }] = (await sql`
  select count(*)::int as n from ai_usage
   where created_at > now() - ${since}::interval
`) as { n: number }[];

if (n === 0) {
  console.log(`No ai_usage rows in the last ${DAYS} days. Nothing to report.`);
  process.exit(0);
}

await sectionA();
await sectionB();
await sectionC();
await sectionD();
await sectionE();

process.exit(0);
