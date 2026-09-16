'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * `email` comes back on failure because React resets a form after its action
 * settles — without it a mistyped password also wipes the address.
 */
export type AuthState = { error: string | null; email?: string };

/** Where the confirmation and recovery links come back to. */
function origin() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002';
}

const read = (data: FormData, key: string) =>
  String(data.get(key) ?? '').trim();

export async function signIn(
  _prev: AuthState,
  data: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: read(data, 'email').toLowerCase(),
    password: String(data.get('password') ?? ''),
  });
  // Deliberately not "no such account" vs "wrong password": that difference
  // tells anyone with a list of emails which ones are real.
  if (error)
    return {
      error: 'That email and password do not match.',
      email: String(data.get('email') ?? ''),
    };

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signUp(
  _prev: AuthState,
  data: FormData,
): Promise<AuthState> {
  const password = String(data.get('password') ?? '');
  if (password.length < 8) {
    return {
      error: 'Use at least 8 characters for your password.',
      email: read(data, 'email'),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: read(data, 'email').toLowerCase(),
    password,
    options: {
      emailRedirectTo: `${origin()}/auth/callback`,
      // The dashboard greets candidates by name. Optional, because a blank
      // greeting is a smaller cost than a field standing between someone and
      // their first practice.
      data: { first_name: read(data, 'firstName') || null },
    },
  });
  if (error) return { error: error.message, email: read(data, 'email') };

  // With confirmations off the session is already live and this lands on
  // onboarding; with them on, the dashboard bounces to /sign-in until the link
  // is clicked. Either way the next screen is the honest one.
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function requestPasswordReset(
  _prev: AuthState,
  data: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(read(data, 'email').toLowerCase(), {
    redirectTo: `${origin()}/auth/callback?next=/reset-password`,
  });
  // No error branch on purpose: a failure here would say whether the address
  // has an account. The page says "if that address has an account" regardless.
  redirect('/forgot-password?sent=1');
}

export async function updatePassword(
  _prev: AuthState,
  data: FormData,
): Promise<AuthState> {
  const password = String(data.get('password') ?? '');
  if (password.length < 8) {
    return { error: 'Use at least 8 characters for your password.' };
  }

  const supabase = await createClient();
  // The recovery link already exchanged itself for a session in the callback
  // route, so this is an ordinary authenticated write.
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/sign-in');
}
