import {
  getResourceBySlug,
  listResources as dbListResources,
} from '@bandzen/db/queries';
import { resourceCategory } from '@/lib/db/schema';
import type { Resource as DbResource, Skill } from '@/lib/db/schema';
import type { QuestionKind } from '@/lib/modules';

/**
 * Reference material. Content lives in the `resources` table (editable via
 * the CMS, backfilled from what used to be a hand-authored array here). This
 * module adapts DB rows to the shape the app was built against — `id` is the
 * row's slug — so call sites needed only an `await`.
 */

export const RESOURCE_CATEGORIES = resourceCategory.enumValues;
export type { ResourceCategory, ResourceLevel } from '@/lib/db/schema';
export { CATEGORY_TITLE } from '@/lib/db/schema';

export type Resource = {
  id: string;
  title: string;
  summary: string;
  category: DbResource['category'];
  level: DbResource['level'];
  minutes: number;
  /** The module this belongs to, where it maps to one we can practise. */
  module?: Skill;
  questionKind?: QuestionKind;
  /** Paragraphs. Absent means written down as needed but not yet drafted. */
  body?: readonly string[];
};

function toResource(row: DbResource): Resource {
  return {
    id: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    level: row.level,
    minutes: row.minutes,
    module: row.module ?? undefined,
    questionKind: row.questionKind ?? undefined,
    body: row.body ?? undefined,
  };
}

export async function listResources(): Promise<readonly Resource[]> {
  const rows = await dbListResources({ status: 'published' });
  return rows.map(toResource);
}

export async function getResource(slug: string): Promise<Resource | null> {
  const row = await getResourceBySlug(slug, { status: 'published' });
  return row ? toResource(row) : null;
}
