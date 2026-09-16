'use server';

import { revalidatePath } from 'next/cache';
import { setRole, setRoleByEmail } from '@bandzen/db/queries';
import { requireAdmin } from '@/lib/auth';

export type GrantFormState = { error: string | null };

export async function grantRole(
  _prev: GrantFormState,
  formData: FormData,
): Promise<GrantFormState> {
  await requireAdmin();

  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const role = formData.get('role');
  if (!email || (role !== 'admin' && role !== 'teacher')) {
    return { error: 'Enter an email and pick a role.' };
  }

  const granted = await setRoleByEmail(email, role);
  if (!granted) {
    return {
      error: `No account with email ${email} — they need to sign up first.`,
    };
  }

  revalidatePath('/teachers');
  return { error: null };
}

export async function revokeRole(formData: FormData) {
  await requireAdmin();

  const userId = String(formData.get('userId') ?? '');
  if (!userId) return;

  await setRole(userId, null);
  revalidatePath('/teachers');
}
