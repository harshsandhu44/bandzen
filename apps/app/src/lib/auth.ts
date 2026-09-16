import 'server-only';

import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/db/queries';

/**
 * The user id every query is scoped by.
 *
 * `getUser()` rather than `getSession()`: the session is read straight off a
 * cookie the browser could have written, whereas this asks the auth server to
 * verify the token. Cheap, and it is the difference between a check and a
 * decoration.
 */
export async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  return user.id;
}

/**
 * The account behind the session, in the shape the screens actually use: an
 * email for the settings page and the Polar checkout, a first name for the
 * dashboard greeting. Normalised here so `user_metadata` — which is whatever
 * sign-up happened to write — is read in one place rather than five.
 */
export async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const firstName = user.user_metadata?.first_name;
  return {
    id: user.id,
    email: user.email ?? null,
    firstName: typeof firstName === 'string' && firstName ? firstName : null,
  };
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const profile = await getProfile(user.id);
  const email = (profile?.email ?? user.email)?.toLowerCase();
  const ok =
    profile?.role === 'admin' ||
    profile?.role === 'teacher' ||
    (!!email && ADMIN_EMAILS.has(email));
  if (!ok) notFound();
}
