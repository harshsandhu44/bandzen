'use server';

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/auth';
import { markAwardsNotified } from '@/lib/db/queries';

/**
 * Dismiss the award strip.
 *
 * Everything unseen is acknowledged at once rather than one at a time: two
 * awards can cross on the same attempt, and dismissing them individually would
 * make the strip reappear for something the candidate has already read.
 */
export async function acknowledgeAwards() {
  const userId = await requireUserId();
  await markAwardsNotified(userId);
  revalidatePath('/');
}
