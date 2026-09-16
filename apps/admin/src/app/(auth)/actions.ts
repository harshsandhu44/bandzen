'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * `email` comes back on failure because React resets a form after its action
 * settles — without it a mistyped password also wipes the address.
 */
export type AuthState = { error: string | null; email?: string };

export async function signIn(
  _prev: AuthState,
  data: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(data.get('email') ?? '')
      .trim()
      .toLowerCase(),
    password: String(data.get('password') ?? ''),
  });
  if (error)
    return {
      error: 'That email and password do not match.',
      email: String(data.get('email') ?? ''),
    };

  revalidatePath('/', 'layout');
  redirect('/');
}

/**
 * Start the Google round trip; `/auth/callback` finishes it. The origin comes
 * from the request, which is safe because Supabase only redirects to URLs on
 * the project's allow list.
 */
export async function signInWithGoogle() {
  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect('/sign-in?error=oauth');
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/sign-in');
}
