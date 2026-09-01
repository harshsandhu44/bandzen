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

export type ActionState = { error: string | null };

/** Blank-line-separated textarea -> one string per paragraph. */
function splitParagraphs(value: FormDataEntryValue | null): string[] | null {
  const paragraphs = String(value ?? '')
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return paragraphs.length > 0 ? paragraphs : null;
}

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

export async function updateResourceAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  await updateResource(
    id,
    {
      title: String(formData.get('title') ?? '').trim(),
      summary: String(formData.get('summary') ?? '').trim(),
      category: formData.get('category') as never,
      level: formData.get('level') as never,
      minutes: Number(formData.get('minutes') ?? 5),
      module: orNull(formData.get('module')) as never,
      questionKind: orNull(formData.get('questionKind')) as never,
      body: splitParagraphs(formData.get('body')),
    },
    userId,
  );
  revalidatePath(`/resources/${id}`);
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
