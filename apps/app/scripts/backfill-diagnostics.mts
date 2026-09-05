/**
 * Wrap every pre-existing 2-skill diagnostic in a `mock_attempts` row.
 *
 *   node --env-file=.env.local scripts/backfill-diagnostics.mts          # dry run
 *   node --env-file=.env.local scripts/backfill-diagnostics.mts --apply
 *
 * The diagnostic used to be a reading attempt (`kind='diagnostic'`,
 * `module='reading'`) with a writing child via `parent_id`. It is now a
 * `mock_attempts` row with `kind='diagnostic'` and its sections linked by
 * `mock_attempt_id`, the same as a mock. This backfill gives each old
 * diagnostic such a row so `getDiagnosticResult`, `diagnosticCount` and the
 * result page all read through the one path.
 *
 * Idempotent: it skips any reading attempt that already has a
 * `mock_attempt_id`. `submitted_at` is set from the writing child (or the
 * reading attempt) so `diagnosticCount` still counts these.
 *
 * **Run `--apply` right after the deploy.** Until it runs, `diagnosticCount`
 * (which now reads `mock_attempts`) returns 0 for every existing user, so the
 * free-diagnostic gate reopens and old `/diagnostic/<readingAttemptId>/result`
 * links 404. Same ordering constraint as `grant-founding.mts`.
 *
 * Delete this script once it has run against production.
 */
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url)
  throw new Error('Missing DATABASE_URL. Try: node --env-file=.env.local ...');

const sql = neon(url);
const apply = process.argv.includes('--apply');

const rows = (await sql`
  SELECT
    r.id            AS reading_id,
    r.user_id       AS user_id,
    r.passage_id    AS passage_id,
    r.started_at    AS started_at,
    r.submitted_at  AS reading_submitted_at,
    w.id            AS writing_id,
    w.prompt_id     AS writing_prompt_id,
    w.submitted_at  AS writing_submitted_at
  FROM attempts r
  LEFT JOIN attempts w
    ON w.parent_id = r.id AND w.user_id = r.user_id
  WHERE r.kind = 'diagnostic'
    AND r.module = 'reading'
    AND r.mock_attempt_id IS NULL
`) as {
  reading_id: string;
  user_id: string;
  passage_id: string | null;
  started_at: string;
  reading_submitted_at: string | null;
  writing_id: string | null;
  writing_prompt_id: string | null;
  writing_submitted_at: string | null;
}[];

// `mock_attempts.writing_task2_prompt_id` is NOT NULL — a reading attempt with
// no essay child (abandoned before Writing) cannot be wrapped and does not
// count towards the free-diagnostic gate anyway.
const wrappable = rows.filter((r) => r.writing_prompt_id != null);
const skipped = rows.length - wrappable.length;

console.log(
  `legacy diagnostics: ${rows.length} · wrappable: ${wrappable.length}` +
    (skipped ? ` · skipped (no essay child): ${skipped}` : ''),
);

if (!apply) {
  console.log('\nDry run. Re-run with --apply to write.');
  process.exit(0);
}

let wrapped = 0;
for (const row of wrappable) {
  const passageIds = row.passage_id ? [row.passage_id] : [];
  const submittedAt =
    row.writing_submitted_at ?? row.reading_submitted_at ?? new Date().toISOString();

  const [created] = (await sql`
    INSERT INTO mock_attempts (
      user_id, kind, reading_passage_ids, listening_track_ids,
      writing_task1_prompt_id, writing_task2_prompt_id, speaking_test_id,
      started_at, submitted_at
    ) VALUES (
      ${row.user_id}, 'diagnostic',
      ${JSON.stringify(passageIds)}::jsonb, '[]'::jsonb,
      NULL, ${row.writing_prompt_id}, NULL,
      ${row.started_at}, ${submittedAt}
    )
    RETURNING id
  `) as { id: string }[];

  const ids = [row.reading_id, ...(row.writing_id ? [row.writing_id] : [])];
  await sql`
    UPDATE attempts SET mock_attempt_id = ${created!.id}
    WHERE id = ANY(${ids})
  `;
  wrapped += 1;
}

console.log(`wrapped ${wrapped} diagnostic(s)`);
