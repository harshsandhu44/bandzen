'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createWritingPrompt,
  updateWritingPrompt,
  publishWritingPrompt,
  unpublishWritingPrompt,
  deleteWritingPrompt,
  recordContentEvent,
} from '@bandzen/db/queries';
import { ContentInUseError, PublishValidationError } from '@bandzen/db/errors';
import { requireAdminOrTeacher } from '@/lib/auth';
import { runBulk } from '@/lib/bulk';
import { ok, fail, type ActionResult } from '@/lib/action-result';
import { promptFormSchema } from './[id]/schema';

export type ActionState = { error: string | null };

export async function createWritingPromptAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const prompt = await createWritingPrompt({
    slug: String(formData.get('slug') ?? '').trim(),
    task: Number(formData.get('task') ?? 2),
    format: (formData.get('format') as 'academic' | 'general') ?? 'academic',
    promptText: String(formData.get('promptText') ?? '').trim(),
    updatedBy: userId,
  });
  if (!prompt) throw new Error('Failed to create writing prompt.');
  await recordContentEvent('writing-prompt', prompt.id, userId, 'created');
  redirect(`/writing-prompts/${prompt.id}`);
}


export async function publishWritingPromptAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await publishWritingPrompt(id, userId);
    await recordContentEvent('writing-prompt', id, userId, 'published');
  } catch (e) {
    if (e instanceof PublishValidationError)
      return { error: `Missing: ${e.issues.join(', ')}` };
    throw e;
  }
  revalidatePath(`/writing-prompts/${id}`);
  revalidatePath('/writing-prompts');
  return { error: null };
}

export async function unpublishWritingPromptAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  await unpublishWritingPrompt(id, userId);
  await recordContentEvent('writing-prompt', id, userId, 'unpublished');
  revalidatePath(`/writing-prompts/${id}`);
  revalidatePath('/writing-prompts');
}

export async function deleteWritingPromptAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await deleteWritingPrompt(id);
  } catch (e) {
    if (e instanceof ContentInUseError) return { error: e.message };
    throw e;
  }
  await recordContentEvent('writing-prompt', id, userId, 'deleted');
  revalidatePath('/writing-prompts');
  redirect('/writing-prompts');
}

export async function savePromptAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const parsed = promptFormSchema.safeParse(input);
  if (!parsed.success) return fail('Check the highlighted fields.');
  try {
    await updateWritingPrompt(id, parsed.data, userId);
    await recordContentEvent('writing-prompt', id, userId, 'updated');
    revalidatePath(`/writing-prompts/${id}`);
    revalidatePath('/writing-prompts');
    return ok('Saved');
  } catch (e) {
    console.error('[cms] savePrompt failed', e);
    return fail(e instanceof Error ? e.message : 'Could not save.');
  }
}

export async function bulkPublishPromptsAction(
  ids: string[],
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => publishWritingPrompt(id, userId), 'Published');
  revalidatePath('/writing-prompts');
  return result;
}

export async function bulkUnpublishPromptsAction(
  ids: string[],
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => unpublishWritingPrompt(id, userId), 'Unpublished');
  revalidatePath('/writing-prompts');
  return result;
}

export async function bulkDeletePromptsAction(
  ids: string[],
): Promise<ActionResult> {
  await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => deleteWritingPrompt(id), 'Deleted');
  revalidatePath('/writing-prompts');
  return result;
}
