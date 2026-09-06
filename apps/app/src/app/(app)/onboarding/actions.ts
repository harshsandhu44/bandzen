'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import { completeOnboarding, getProfile } from '@/lib/db/queries';
import { firstIssue, parseProfileForm } from '@/lib/profile';

export type OnboardingState = { error: string | null };

/**
 * Save the profile and let the candidate through.
 *
 * One action for the whole form. Six answers do not need six routes and six
 * partial-profile states to reason about, and a single submit means the
 * profile is either complete or absent — never half-written.
 */
export async function saveOnboarding(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const userId = await requireUserId();

  const parsed = parseProfileForm(formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await completeOnboarding(userId, parsed.data);

  // The shell above this action reads the profile to head its screens with the
  // candidate's target band, and a redirect alone does not re-render it.
  revalidatePath('/', 'layout');

  // Someone who cannot estimate their own level is sent to measure it; anyone
  // else goes straight to the dashboard, which now has a target to plan for.
  const profile = await getProfile(userId);
  redirect(profile?.selfAssessedBand == null ? '/diagnostic' : '/');
}
