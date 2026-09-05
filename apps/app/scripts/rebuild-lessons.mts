/**
 * Replace the lesson catalogue with the new beginner-to-expert set.
 *
 *   node --env-file=.env.local scripts/rebuild-lessons.mts
 *
 * Does NOT hard-delete the old lessons -- `deleteLesson()` in
 * `@bandzen/db/queries` already refuses that while completion records exist
 * ("Unpublish it instead"), which is a deliberate rail, not an accident.
 * Instead: unpublish every currently published lesson (their `lesson_progress`
 * rows stay put and harmless), then insert the new 40 as published. Safe to
 * run twice -- unpublishing an already-draft lesson is a no-op, and slugs are
 * unique so a second run fails fast on the insert instead of duplicating.
 */
import { neon } from '@neondatabase/serverless';
import { READING_LESSONS } from './lesson-content/reading.ts';
import { WRITING_LESSONS } from './lesson-content/writing.ts';
import { LISTENING_LESSONS } from './lesson-content/listening.ts';
import { SPEAKING_LESSONS } from './lesson-content/speaking.ts';
import type { LessonSeed } from './lesson-content/types.ts';

const url = process.env.DATABASE_URL;
if (!url)
  throw new Error('Missing DATABASE_URL. Try: node --env-file=.env.local ...');
const sql = neon(url);

const ALL_LESSONS: LessonSeed[] = [
  ...READING_LESSONS,
  ...WRITING_LESSONS,
  ...LISTENING_LESSONS,
  ...SPEAKING_LESSONS,
];

// Every lesson here ships with full stages, so checkLessonCompleteness's
// requirement (at least one stage with a non-empty block) always holds --
// verify that assumption rather than silently publishing a broken lesson.
for (const l of ALL_LESSONS) {
  if (!l.stages.length || l.stages.every((s) => s.blocks.length === 0)) {
    throw new Error(`${l.slug} has no content -- refusing to publish it`);
  }
}

const unpublished = await sql`
  update lessons set status = 'draft' where status = 'published' returning id
`;
console.log(`Unpublished ${unpublished.length} old lesson(s).`);

for (const l of ALL_LESSONS) {
  await sql`
    insert into lessons
      (slug, module, "group", title, summary, minutes, question_kind, stages, order_index, status, updated_by)
    values
      (${l.slug}, ${l.module}, ${l.group}, ${l.title}, ${l.summary}, ${l.minutes},
       ${l.questionKind ?? null}, ${JSON.stringify(l.stages)}::jsonb, ${l.orderIndex},
       'published', 'rebuild-lessons script')
  `;
}
console.log(`Inserted ${ALL_LESSONS.length} new lesson(s).`);

const counts = await sql`
  select module, "group", status, count(*) from lessons
  group by module, "group", status order by module, "group"
`;
console.log('Lessons table now:', counts);
