'use server';

import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import {
  createAttempt,
  latestDiagnostic,
  pickEasiestPassage,
  upsertProfile,
} from '@/lib/db/queries';

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

  const existing = await latestDiagnostic(userId);
  if (existing?.status === 'in_progress') redirect(`/reading/${existing.id}`);
  if (existing) redirect(`/diagnostic/${existing.id}/result`);

  // Easiest passage available keeps the diagnostic near 35 minutes total.
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
