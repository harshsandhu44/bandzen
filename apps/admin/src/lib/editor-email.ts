import 'server-only';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * Resolve a Clerk user id (what `updatedBy` stores) to an email for display.
 * Rows backfilled before the CMS existed have no editor; returns an em dash.
 */
export async function resolveEditorEmail(
  userId: string | null,
): Promise<string> {
  if (!userId) return '—';
  try {
    const user = await (await clerkClient()).users.getUser(userId);
    return user.primaryEmailAddress?.emailAddress ?? userId;
  } catch {
    return userId;
  }
}

/** Resolve many Clerk user ids to emails in one call. Unknown ids echo back. */
export async function resolveEditorEmails(
  ids: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  try {
    const { data } = await (
      await clerkClient()
    ).users.getUserList({ userId: unique });
    for (const user of data) {
      map.set(user.id, user.primaryEmailAddress?.emailAddress ?? user.id);
    }
  } catch {
    // leave unresolved — the caller falls back to the raw id
  }
  return map;
}
