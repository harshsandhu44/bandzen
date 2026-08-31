'use server';

import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import {
  createAttempt,
  diagnosticCount,
  findChildAttempt,
  isPro,
  latestDiagnostic,
  pickEasiestPassage,
  upsertProfile,
} from '@/lib/db/queries';
import { canStartDiagnostic } from '@/lib/entitlements';

/**
 * Start the diagnostic: record the target and exam date the study plan needs,
 * then hand over to the reading engine. No new test surface is created — the
 * diagnostic is a composition of the two engines that already exist.
 */
export async function startDiagnostic(formData: FormData) {
  const targetBand = Number(String(formData.get('targetBand') ?? ''));
  if (!Number.isFinite(targetBand) || targetBand < 4 || targetBand > 9) {
    throw new Error('Target band must be between 4 and 9');
  }

  const rawDate = String(formData.get('testDate') ?? '').trim();
  if (rawDate && !/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    throw new Error('Test date must be a calendar date');
  }

  const userId = await requireUserId();
  await upsertProfile(userId, { targetBand, testDate: rawDate || null });

  const [existing, pro] = await Promise.all([
    latestDiagnostic(userId),
    isPro(userId),
  ]);

  if (existing) {
    // Resuming, in either half. The writing branch is new: reading could be
    // finished while the essay is still open, and sending someone to a result
    // page they cannot complete is how an unfinished diagnostic became a dead
    // end.
    if (existing.status === 'in_progress') redirect(`/reading/${existing.id}`);
    const child = await findChildAttempt(userId, existing.id);
    if (child?.status === 'in_progress') redirect(`/writing/${child.id}`);

    // Counted on sittings that produced a result, so a diagnostic that broke
    // half way is not what locks a candidate out of the one free measurement
    // the whole funnel points at.
    const taken = await diagnosticCount(userId);
    if (!canStartDiagnostic({ isPro: pro, taken })) {
      redirect(`/diagnostic/${existing.id}/result`);
    }
  }

  // Easiest passage available: the diagnostic should measure, not exhaust.
  // Its length is stated from the engines' own rules -- see lib/timing.ts.
  const passage = await pickEasiestPassage();
  if (!passage) throw new Error('No passages seeded — see apps/app/README.md');

  const attempt = await createAttempt({
    userId,
    module: 'reading',
    kind: 'diagnostic',
    passageId: passage.id,
  });

  redirect(`/reading/${attempt.id}`);
}
