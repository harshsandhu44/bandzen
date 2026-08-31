/**
 * Comp the closed-beta cohort ninety days of Pro.
 *
 *   node --env-file=.env.local scripts/grant-founding.mts          # dry run
 *   node --env-file=.env.local scripts/grant-founding.mts --apply
 *
 * Run this **after** `pnpm db:migrate` and **before** deploying the code that
 * gates on entitlement. Those users have had unlimited everything through the
 * beta; if the gates land first they are all metered with no warning.
 *
 * A grant is a row with a future `current_period_end` and no Razorpay id, so
 * `isPro` needs no special case for it. `on conflict do nothing` makes this
 * safe to run twice and means it can never shorten a subscription someone has
 * actually paid for.
 *
 * It reads `profiles`, which is every candidate who finished onboarding.
 * Someone who signed up and never onboarded has no row here and is not
 * granted — they are indistinguishable from a new user, and they get the
 * standard seven-day trial when they do onboard.
 *
 * Delete this script once the founding window has closed.
 */
import { neon } from '@neondatabase/serverless';

const FOUNDING_GRANT_DAYS = 90;

const url = process.env.DATABASE_URL;
if (!url)
  throw new Error('Missing DATABASE_URL. Try: node --env-file=.env.local ...');

const sql = neon(url);
const apply = process.argv.includes('--apply');

const [counts] = await sql`
  select
    (select count(*)::int from profiles) as profiles,
    (select count(*)::int from subscriptions) as subscriptions,
    (select count(*)::int from profiles p
      where not exists (
        select 1 from subscriptions s where s.user_id = p.user_id
      )) as would_grant`;

console.log(
  `profiles: ${counts!.profiles} · existing subscriptions: ${counts!.subscriptions} · would grant: ${counts!.would_grant}`,
);

if (!apply) {
  console.log('\nDry run. Re-run with --apply to write.');
  process.exit(0);
}

const granted = await sql`
  insert into subscriptions (user_id, plan_id, status, current_period_end)
  select user_id, 'founding', 'granted',
         now() + (${FOUNDING_GRANT_DAYS} || ' days')::interval
  from profiles
  on conflict (user_id) do nothing
  returning user_id`;

console.log(
  `granted founding to ${granted.length} user(s), ending in ${FOUNDING_GRANT_DAYS} days`,
);
