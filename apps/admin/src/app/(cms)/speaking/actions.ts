'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createSpeakingPrompt,
  createSpeakingTest,
  deleteSpeakingPrompt,
  deleteSpeakingTest,
  publishSpeakingTest,
  unpublishSpeakingTest,
  updateSpeakingPrompt,
  updateSpeakingTest,
} from '@bandzen/db/queries';
import { ContentInUseError, PublishValidationError } from '@bandzen/db/errors';
import { requireAdminOrTeacher } from '@/lib/auth';

export type ActionState = { error: string | null };

/** Multi-line textarea -> string[] (one entry per non-blank line), or null. */
function splitLines(value: FormDataEntryValue | null): string[] | null {
  const lines = String(value ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : null;
}

export async function createTestAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const test = await createSpeakingTest({
    slug: String(formData.get('slug') ?? '').trim(),
    title: String(formData.get('title') ?? '').trim(),
    topic: String(formData.get('topic') ?? '').trim() || null,
    difficulty: Number(formData.get('difficulty') ?? 3),
    updatedBy: userId,
  });
  if (!test) throw new Error('Failed to create test.');
  redirect(`/speaking/${test.id}`);
}

export async function updateTestAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  await updateSpeakingTest(
    id,
    {
      title: String(formData.get('title') ?? '').trim(),
      topic: String(formData.get('topic') ?? '').trim() || null,
      difficulty: Number(formData.get('difficulty') ?? 3),
    },
    userId,
  );
  revalidatePath(`/speaking/${id}`);
}

/**
 * Clear one prompt's audio so the edit page's generation poll re-synthesizes
 * it from the (presumably just-edited) text. One generation code path, in the
 * API route.
 */
export async function regenerateAudioAction(formData: FormData) {
  const promptId = String(formData.get('promptId') ?? '');
  const testId = String(formData.get('testId') ?? '');
  await updateSpeakingPrompt(promptId, { audioUrl: null });
  revalidatePath(`/speaking/${testId}`);
}

export async function publishTestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await publishSpeakingTest(id, userId);
  } catch (e) {
    if (e instanceof PublishValidationError)
      return { error: `Missing: ${e.issues.join(', ')}` };
    throw e;
  }
  revalidatePath(`/speaking/${id}`);
  revalidatePath('/speaking');
  return { error: null };
}

export async function unpublishTestAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  await unpublishSpeakingTest(id, userId);
  revalidatePath(`/speaking/${id}`);
  revalidatePath('/speaking');
}

export async function deleteTestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await deleteSpeakingTest(id);
  } catch (e) {
    if (e instanceof ContentInUseError) return { error: e.message };
    throw e;
  }
  revalidatePath('/speaking');
  redirect('/speaking');
}

export async function createPromptAction(formData: FormData) {
  await requireAdminOrTeacher();
  const testId = String(formData.get('testId') ?? '');
  const part = Number(formData.get('part') ?? 1);
  await createSpeakingPrompt(testId, {
    idx: Number(formData.get('idx') ?? 0),
    part,
    text: String(formData.get('text') ?? '').trim(),
    cueCardPoints:
      part === 2 ? splitLines(formData.get('cueCardPoints')) : null,
    prepSeconds: part === 2 ? 60 : 0,
  });
  revalidatePath(`/speaking/${testId}`);
}

export async function updatePromptAction(formData: FormData) {
  await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  const testId = String(formData.get('testId') ?? '');
  const part = Number(formData.get('part') ?? 1);
  await updateSpeakingPrompt(id, {
    idx: Number(formData.get('idx') ?? 0),
    part,
    text: String(formData.get('text') ?? '').trim(),
    cueCardPoints:
      part === 2 ? splitLines(formData.get('cueCardPoints')) : null,
    prepSeconds: part === 2 ? 60 : 0,
  });
  revalidatePath(`/speaking/${testId}`);
}

export async function deletePromptAction(formData: FormData) {
  await requireAdminOrTeacher();
  const testId = String(formData.get('testId') ?? '');
  await deleteSpeakingPrompt(String(formData.get('id') ?? ''));
  revalidatePath(`/speaking/${testId}`);
}
