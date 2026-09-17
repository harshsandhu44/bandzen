'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { capture } from '@/lib/analytics';
import { requireUserId } from '@/lib/auth';
import { todayIso } from '@/lib/dates';
import {
  getProfile,
  moveAssignment,
  replanPlan,
  setPlanPaused,
  skipAssignment,
} from '@/lib/db/queries';

/**
 * The candidate's own controls over their plan (#131). Every one of them
 * changes a committed assignment or the plan as a whole, and every one is
 * scoped to the signed-in candidate in the query that writes it.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function skipPlanTask(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return;
  const reason = String(formData.get('reason') ?? '')
    .trim()
    .slice(0, 200);
  const row = await skipAssignment(userId, id, reason || null);
  if (!row) return;
  after(() =>
    capture(userId, 'plan_assignment_skipped', {
      skill: row.skill,
      exam_key: row.examKey,
      with_reason: Boolean(reason),
    }),
  );
  revalidatePath('/');
}

/** Move a task to a later day: tomorrow, or a date the candidate picks. */
export async function movePlanTask(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get('id') ?? '');
  if (!UUID.test(id)) return;
  const date = String(formData.get('date') ?? '');
  const profile = await getProfile(userId);
  // Only forward, and only to a real calendar day in their own zone.
  if (!ISO_DATE.test(date) || date <= todayIso(profile?.timezone)) return;
  const row = await moveAssignment(userId, id, date);
  if (!row) return;
  after(() =>
    capture(userId, 'plan_assignment_deferred', {
      skill: row.skill,
      exam_key: row.examKey,
    }),
  );
  revalidatePath('/');
}

export async function pausePlan() {
  await setPaused(true);
}

export async function resumePlan() {
  await setPaused(false);
}

async function setPaused(paused: boolean) {
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  if (!profile?.examKey) return;
  await setPlanPaused(userId, profile.examKey, paused);
  after(() =>
    capture(userId, paused ? 'plan_paused' : 'plan_resumed', {
      exam_key: profile.examKey,
    }),
  );
  revalidatePath('/');
}

/** Throw away today's and later unstarted work and plan it again. */
export async function replanRemaining() {
  const userId = await requireUserId();
  const profile = await getProfile(userId);
  if (!profile?.examKey) return;
  await replanPlan(userId, profile.examKey, 'user_replan', {
    includeToday: true,
  });
  after(() =>
    capture(userId, 'plan_replanned', {
      exam_key: profile.examKey,
      reason: 'user_replan',
    }),
  );
  revalidatePath('/');
}
