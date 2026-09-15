'use server';

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/auth';
import { upsertProfile } from '@/lib/db/queries';
import { firstIssue, parseProfileForm } from '@/lib/profile';

export type SettingsState = { error: string | null; saved?: boolean };

/**
 * Edit the profile.
 *
 * Same schema and same fields as onboarding, but `upsertProfile` rather than
 * `completeOnboarding` — editing your target band should never re-stamp the
 * moment you finished setting up.
 */
export async function saveSettings(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const userId = await requireUserId();

  const parsed = parseProfileForm(formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await upsertProfile(userId, parsed.data);

  // The sidebar countdown, the exam menu and every plan read from this profile.
  // A new exam here becomes an enrollment of its own; the old one is kept.
  revalidatePath('/', 'layout');
  return { error: null, saved: true };
}
