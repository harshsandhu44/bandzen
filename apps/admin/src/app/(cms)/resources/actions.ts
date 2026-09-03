'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createResource,
  updateResource,
  publishResource,
  unpublishResource,
  deleteResource,
} from '@bandzen/db/queries';
import { ContentInUseError, PublishValidationError } from '@bandzen/db/errors';
import type { Resource } from '@bandzen/db/schema';
import { requireAdminOrTeacher } from '@/lib/auth';
import { runBulk } from '@/lib/bulk';
import { ok, fail, type ActionResult } from '@/lib/action-result';
import {
  saveResourcePayloadSchema,
  type SaveResourcePayload,
} from './[id]/schema';

export type ActionState = { error: string | null };


function orNull(value: FormDataEntryValue | null) {
  const s = String(value ?? '').trim();
  return s || null;
}

export async function createResourceAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const resource = await createResource({
    slug: String(formData.get('slug') ?? '').trim(),
    title: String(formData.get('title') ?? '').trim(),
    summary: String(formData.get('summary') ?? '').trim(),
    category: formData.get('category') as Resource['category'],
    level: formData.get('level') as Resource['level'],
    minutes: Number(formData.get('minutes') ?? 5),
    module: orNull(formData.get('module')) as Resource['module'],
    questionKind: orNull(
      formData.get('questionKind'),
    ) as Resource['questionKind'],
    updatedBy: userId,
  });
  if (!resource) throw new Error('Failed to create resource.');
  redirect(`/resources/${resource.id}`);
}


export async function publishResourceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await publishResource(id, userId);
  } catch (e) {
    if (e instanceof PublishValidationError)
      return { error: `Missing: ${e.issues.join(', ')}` };
    throw e;
  }
  revalidatePath(`/resources/${id}`);
  revalidatePath('/resources');
  return { error: null };
}

export async function unpublishResourceAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  await unpublishResource(id, userId);
  revalidatePath(`/resources/${id}`);
  revalidatePath('/resources');
}

export async function deleteResourceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await deleteResource(id);
  } catch (e) {
    if (e instanceof ContentInUseError) return { error: e.message };
    throw e;
  }
  revalidatePath('/resources');
  redirect('/resources');
}

export async function saveResourceAction(
  id: string,
  input: SaveResourcePayload,
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const parsed = saveResourcePayloadSchema.safeParse(input);
  if (!parsed.success) return fail('Check the highlighted fields.');
  try {
    await updateResource(id, parsed.data, userId);
    revalidatePath(`/resources/${id}`);
    revalidatePath('/resources');
    return ok('Saved');
  } catch (e) {
    console.error('[cms] saveResource failed', e);
    return fail(e instanceof Error ? e.message : 'Could not save.');
  }
}

export async function bulkPublishResourcesAction(
  ids: string[],
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => publishResource(id, userId), 'Published');
  revalidatePath('/resources');
  return result;
}

export async function bulkUnpublishResourcesAction(
  ids: string[],
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => unpublishResource(id, userId), 'Unpublished');
  revalidatePath('/resources');
  return result;
}

export async function bulkDeleteResourcesAction(
  ids: string[],
): Promise<ActionResult> {
  await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => deleteResource(id), 'Deleted');
  revalidatePath('/resources');
  return result;
}
