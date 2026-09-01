import { existsSync } from 'node:fs';
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

import { neon } from '@neondatabase/serverless';

/**
 * Populates lesson_progress.lesson_id_new (a uuid FK to lessons.id) from the
 * existing lesson_id (a lesson slug), ahead of the migration that drops the
 * old text column and renames this one to take its place. Logs match/orphan
 * counts so the destructive follow-up migration only runs after a human has
 * confirmed orphans are ~0. Idempotent: only touches rows still unmatched.
 */

const sql = neon(process.env.DATABASE_URL!);

const updated = await sql`
  UPDATE lesson_progress
  SET lesson_id_new = lessons.id
  FROM lessons
  WHERE lessons.slug = lesson_progress.lesson_id
    AND lesson_progress.lesson_id_new IS NULL
`;

const [{ n: orphans }] = (await sql`
  SELECT count(*)::int AS n FROM lesson_progress WHERE lesson_id_new IS NULL
`) as [{ n: number }];

const [{ n: total }] = (await sql`
  SELECT count(*)::int AS n FROM lesson_progress
`) as [{ n: number }];

console.log(`lesson_progress rows: ${total}`);
console.log(`Matched this run: ${updated.length ?? 'unknown'}`);
console.log(`Orphans (lesson_id has no matching lessons.slug): ${orphans}`);
if (orphans > 0) {
  const rows = (await sql`
    SELECT DISTINCT lesson_id FROM lesson_progress WHERE lesson_id_new IS NULL
  `) as { lesson_id: string }[];
  console.log(
    'Orphaned lesson_id values:',
    rows.map((r) => r.lesson_id),
  );
  console.log(
    '\nDo NOT run the follow-up migration until you have reviewed these — they will be deleted.',
  );
}

process.exit(0);
