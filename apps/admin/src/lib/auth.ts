import 'server-only';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { forbidden, redirect } from 'next/navigation';

export type Role = 'admin' | 'teacher';

// Break-glass admin allowlist, kept permanently (not just for bootstrap): the
// first admin has no one to grant them the Clerk role, and a cleared/wiped
// publicMetadata should not lock everyone out of the CMS.
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export async function requireAdminOrTeacher(): Promise<{
  userId: string;
  role: Role;
  email: string | null;
}> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const user = await (await clerkClient()).users.getUser(userId);
  const claimed = user.publicMetadata.role as Role | undefined;
  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isAdmin = claimed === 'admin' || (!!email && ADMIN_EMAILS.has(email));

  // Not a redirect: this app shares its Clerk instance with apps/app, so a
  // signed-in student is a real session here. Redirecting a denied session to a
  // page that is itself gated is how the `/` -> `/teachers` -> `/` loop arose.
  // `forbidden()` renders src/app/forbidden.tsx and terminates.
  if (!isAdmin && claimed !== 'teacher') forbidden();
  // The email comes back because the shell shows it: the redirect loop this
  // app's auth was rebuilt around happened when a signed-in student session
  // reached the CMS and there was no way to see which account you were on.
  // It costs nothing here — `user` is already fetched for the role.
  return { userId, role: isAdmin ? 'admin' : 'teacher', email: email ?? null };
}

export async function requireAdmin(): Promise<{ userId: string }> {
  const { userId, role } = await requireAdminOrTeacher();
  if (role !== 'admin') forbidden();
  return { userId };
}
