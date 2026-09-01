'use server';

import { clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
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

  const clerk = await clerkClient();
  const { data } = await clerk.users.getUserList({ emailAddress: [email] });
  const user = data[0];
  if (!user) {
    return {
      error: `No Clerk user with email ${email} — they need to sign up first.`,
    };
  }

  await clerk.users.updateUserMetadata(user.id, { publicMetadata: { role } });
  revalidatePath('/teachers');
  return { error: null };
}

export async function revokeRole(formData: FormData) {
  await requireAdmin();

  const userId = String(formData.get('userId') ?? '');
  if (!userId) return;

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: { role: null },
  });
  revalidatePath('/teachers');
}
