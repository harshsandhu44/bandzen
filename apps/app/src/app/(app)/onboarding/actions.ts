'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import { completeOnboarding, getProfile, grantPro } from '@/lib/db/queries';
import { TRIAL_DAYS, grantEndsAt } from '@/lib/entitlements';
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

  // The reverse trial: Pro first, then a fall back to Free rather than to
  // nothing. Hung off onboarding rather than sign-up so the model spend only
  // ever goes on someone who has told us their target band and test date.
  //
  // `grantPro` is a no-op when a row already exists, which is what makes this
  // safe to call from an action anyone can invoke directly — the trial is
  // one-per-user by primary key, not by a check that could be raced.
  await grantPro(userId, 'trial', grantEndsAt(TRIAL_DAYS));

  // The shell above this action reads the profile and the subscription for the
  // countdown and the Pro upsell, and a redirect alone does not re-render it.
  // Without this the first screen of a new candidate's life shows the upsell to
  // someone who was granted a trial one line ago, and no target band.
  revalidatePath('/', 'layout');

  // Someone who cannot estimate their own level is sent to measure it; anyone
  // else goes straight to the dashboard, which now has a target to plan for.
  const profile = await getProfile(userId);
  redirect(profile?.selfAssessedBand == null ? '/diagnostic' : '/');
}
