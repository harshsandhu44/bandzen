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
