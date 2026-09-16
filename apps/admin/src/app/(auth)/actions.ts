'use server';

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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/sign-in');
}
