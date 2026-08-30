/**
 * Apply supabase/seed.sql-style content SQL to Neon.
 *
 *   node --env-file=.env.local scripts/seed.mts
 *
 * Drizzle owns the schema (`pnpm db:migrate`); this only loads generated
 * content. Kept separate because content is regenerated far more often than
 * the schema changes.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';

const file =
  process.argv[2] ?? join(import.meta.dirname, '..', 'content', 'seed.sql');
const url = process.env.DATABASE_URL;
if (!url)
  throw new Error('Missing DATABASE_URL. Try: node --env-file=.env.local ...');

const sql = neon(url);
const text = readFileSync(file, 'utf8');

// The generator emits one statement per `;` at end of line, wrapped in a
// begin/commit it does not need here -- neon's http driver is autocommit per
// statement, so strip the transaction markers and run them in order.
//
// Leading `--` comment lines are stripped from each statement rather than used
// to filter it out: the generator labels every passage insert with a comment,
// and dropping the whole chunk silently skipped the passage while reporting
// success. Only the head of a statement is touched, never a string literal.
const stripLeadingComments = (s: string) =>
  s.replace(/^(?:\s*--[^\n]*\n)+/, '').trim();

const statements = text
  .split(/;\s*$/m)
  .map(stripLeadingComments)
  .filter((s) => s && !/^(begin|commit)$/i.test(s));

console.log(`Applying ${statements.length} statement(s) from ${file}`);
for (const [i, statement] of statements.entries()) {
  try {
    await sql.query(statement);
  } catch (error) {
    console.error(`\nStatement ${i + 1} failed:\n${statement.slice(0, 300)}\n`);
    throw error;
  }
}

// Report what is actually in the database. A seed that runs without error but
// inserts nothing is the failure mode this script already had once.
const [counts] = await sql`
  select
    (select count(*) from passages) as passages,
    (select count(*) from questions) as questions,
    (select count(*) from question_answers) as answers,
    (select count(*) from writing_prompts) as prompts
`;
console.log('Done. Database now holds:', counts);
