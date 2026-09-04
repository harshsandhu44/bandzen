import 'server-only';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';

/**
 * The user id every query is scoped by. proxy.ts already blocks unauthenticated
 * requests, so reaching the redirect here means something is misconfigured
 * rather than that a real visitor is signed out — but failing closed is the
 * only acceptable behaviour either way.
 */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return userId;
}

const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

/**
 * Gate for the CMS preview routes: the same admin/teacher check apps/admin
 * runs, so a content editor can open a draft here as a student sees it.
 * A student who stumbles onto the URL gets a 404, not a redirect loop.
 */
export async function requireContentRole(): Promise<void> {
  const { userId } = await auth();
  if (!userId) notFound();
  const user = await (await clerkClient()).users.getUser(userId);
  const role = user.publicMetadata.role;
  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
  const ok =
    role === 'admin' ||
    role === 'teacher' ||
    (!!email && ADMIN_EMAILS.has(email));
  if (!ok) notFound();
}
