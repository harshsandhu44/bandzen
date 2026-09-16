import 'server-only';

import { forbidden, redirect } from 'next/navigation';
import { getAccount, type Role } from '@bandzen/db/queries';
import { createClient } from '@/lib/supabase/server';

export type { Role };

// Break-glass admin allowlist, kept permanently (not just for bootstrap): the
// first admin has no one to grant them a role, and a cleared `profiles.role`
// should not lock everyone out of the CMS.
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // One query where this used to be an auth-API round trip: the role lives on
  // the profile row, which the `handle_new_user` trigger guarantees exists.
  const account = await getAccount(user.id);
  const claimed = account?.role as Role | null | undefined;
  const email = (account?.email ?? user.email)?.toLowerCase() ?? null;
  const isAdmin = claimed === 'admin' || (!!email && ADMIN_EMAILS.has(email));

  // Not a redirect: this app shares its Supabase project with apps/app, so a
  // signed-in student is a real session here. Redirecting a denied session to a
  // page that is itself gated is how the `/` -> `/teachers` -> `/` loop arose.
  // `forbidden()` renders src/app/forbidden.tsx and terminates.
  if (!isAdmin && claimed !== 'teacher') forbidden();
  // The email comes back because the shell shows it: the redirect loop this
  // app's auth was rebuilt around happened when a signed-in student session
  // reached the CMS and there was no way to see which account you were on.
  return { userId: user.id, role: isAdmin ? 'admin' : 'teacher', email };
}

export async function requireAdmin(): Promise<{ userId: string }> {
  const { userId, role } = await requireAdminOrTeacher();
  if (role !== 'admin') forbidden();
  return { userId };
}
