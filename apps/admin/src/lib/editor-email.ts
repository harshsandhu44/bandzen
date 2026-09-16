import 'server-only';
import { editorEmails } from '@bandzen/db/queries';

/**
 * Resolve the user id `updatedBy` stores to an email for display.
 * Rows backfilled before the CMS existed have no editor; returns an em dash.
 */
export async function resolveEditorEmail(
  userId: string | null,
): Promise<string> {
  if (!userId) return '—';
  const map = await editorEmails([userId]);
  return map.get(userId) ?? userId;
}

/** Resolve many user ids to emails in one query. Unknown ids echo back. */
export async function resolveEditorEmails(
  ids: (string | null | undefined)[],
): Promise<Map<string, string>> {
  return editorEmails(ids.filter((id): id is string => !!id));
}
