'use server';

import { recordAccessRequest } from '@/lib/db/queries';

export type FormState = { error: string | null; done?: boolean };

/**
 * Waitlist capture. Unauthenticated by design — /signup is a public route —
 * so treat everything here as hostile input.
 */
export async function requestAccess(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();

  if (!email || !email.includes('@') || email.length > 320) {
    return { error: 'Enter a valid email address.' };
  }

  try {
    await recordAccessRequest(email);
  } catch {
    return { error: 'Could not record that. Try again.' };
  }

  return { error: null, done: true };
}
