import { getLessonBySlug, listLessons } from '@bandzen/db/queries';
import type { Lesson as DbLesson } from '@/lib/db/schema';
import type { Lesson } from './lesson-types';

/**
 * Lessons live in the `lessons` table (editable via the CMS, backfilled from
 * what used to be a hand-authored array here). This module adapts DB rows to
 * the shape the app was built against — `id` is the row's slug — so call
 * sites needed only an `await`.
 */

function toLesson(row: DbLesson): Lesson {
  return {
    id: row.slug,
    module: row.module,
    group: row.group,
    title: row.title,
    summary: row.summary,
    minutes: row.minutes,
    questionKind: row.questionKind ?? undefined,
    stages: row.stages ?? undefined,
  };
}

export async function getLesson(slug: string): Promise<Lesson | null> {
  const row = await getLessonBySlug(slug, { status: 'published' });
  return row ? toLesson(row) : null;
}

export async function lessonsForModule(
  module: string,
): Promise<readonly Lesson[]> {
  const rows = await listLessons({ status: 'published' });
  return rows.filter((r) => r.module === module).map(toLesson);
}

/** The first written lesson, in module/group/order — used by the dashboard's first-run state. */
export async function firstWrittenLesson(): Promise<Lesson | null> {
  const rows = await listLessons({ status: 'published' });
  const row = rows.find((r) => r.stages && r.stages.length > 0);
  return row ? toLesson(row) : null;
}

/** Written lessons only — the ones a plan may legitimately send someone to. */
export async function lessonForKindMap(): Promise<
  Readonly<Record<string, string>>
> {
  const rows = await listLessons({ status: 'published' });
  return Object.fromEntries(
    rows
      .filter((r) => r.questionKind && r.stages && r.stages.length > 0)
      .map((r) => [r.questionKind!, r.slug]),
  );
}
