'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminOrTeacher } from '@/lib/auth';
import { REGISTRY, type Created, type ImportEntity } from './registry';
import { findSlugClashes } from './schemas';

export type ImportState = { error: string | null; created: Created[] };

/**
 * The one import action, for all four kinds of content. Which one is decided
 * by a hidden `entity` field, which is safe to trust from the client because
 * every branch is gated by the same `requireAdminOrTeacher()` and writes a
 * draft either way -- there is no privilege to escalate by naming a different
 * key.
 *
 * It never redirects. A batch has no single destination, and there is no toast
 * anywhere in this app for a redirect to carry a count into, so the result
 * comes back as state and the page lists what it made.
 */
export async function importAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const { userId } = await requireAdminOrTeacher();

  const entity = String(formData.get('entity') ?? '') as ImportEntity;
  const config = REGISTRY[entity];
  if (!config) return { error: 'Unknown content type.', created: [] };

  // Pasted JSON wins over an attached file -- if both are filled, the text in
  // front of you is the one you meant.
  let raw = String(formData.get('json') ?? '').trim();
  if (!raw) {
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { error: 'Choose a JSON file, or paste JSON.', created: [] };
    }
    raw = await file.text();
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { error: 'That is not valid JSON.', created: [] };
  }

  const prepared = config.prepare(json);
  if ('error' in prepared) return { error: prepared.error, created: [] };

  // Nothing is written until every slug is known to be free. Inserts are not
  // transactional (neon-http), so this check is the only thing standing
  // between a half-imported file and a clean one.
  const existing = new Set(await config.listSlugs());
  const clashes = findSlugClashes(prepared.slugs, existing);
  if (clashes.length > 0) {
    return {
      error: `Nothing was imported. Already exists, or repeated in the file: ${clashes.join(', ')}.`,
      created: [],
    };
  }

  const created: Created[] = [];
  for (const [index, slug] of prepared.slugs.entries()) {
    try {
      created.push(await prepared.insertAt(index, userId));
    } catch (e) {
      revalidatePath(`/${entity}`);
      return {
        error: `Imported ${created.length} of ${prepared.slugs.length}. Stopped at '${slug}': ${e instanceof Error ? e.message : String(e)}`,
        created,
      };
    }
  }

  revalidatePath(`/${entity}`);
  return { error: null, created };
}
