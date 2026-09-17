'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  deleteExamTask,
  publishExamTask,
  recordContentEvent,
  unpublishExamTask,
  getExamTaskAdmin,
} from '@bandzen/db/queries';
import { ContentInUseError, PublishValidationError } from '@bandzen/db/errors';
import { requireAdminOrTeacher } from '@/lib/auth';
import { runBulk } from '@/lib/bulk';
import type { ActionResult } from '@/lib/action-result';

export type ActionState = { error: string | null };

export async function publishExamTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await publishExamTask(id, userId);
    await recordContentEvent('exam-task', id, userId, 'published');
  } catch (e) {
    if (e instanceof PublishValidationError)
      return { error: `Missing: ${e.issues.join(', ')}` };
    throw e;
  }
  revalidatePath(`/tasks/${id}`);
  revalidatePath('/tasks');
  return { error: null };
}

export async function unpublishExamTaskAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  await unpublishExamTask(id, userId);
  await recordContentEvent('exam-task', id, userId, 'unpublished');
  revalidatePath(`/tasks/${id}`);
  revalidatePath('/tasks');
}

export async function deleteExamTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  const task = await getExamTaskAdmin(id);
  if (task?.status === 'published') {
    return { error: 'Unpublish it before deleting.' };
  }
  try {
    await deleteExamTask(id);
  } catch (e) {
    if (e instanceof ContentInUseError) return { error: e.message };
    throw e;
  }
  await recordContentEvent('exam-task', id, userId, 'deleted');
  revalidatePath('/tasks');
  redirect('/tasks');
}

export async function bulkPublishExamTasksAction(
  ids: string[],
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const result = await runBulk(
    ids,
    (id) => publishExamTask(id, userId),
    'Published',
  );
  revalidatePath('/tasks');
  return result;
}

export async function bulkUnpublishExamTasksAction(
  ids: string[],
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const result = await runBulk(
    ids,
    (id) => unpublishExamTask(id, userId),
    'Unpublished',
  );
  revalidatePath('/tasks');
  return result;
}

export async function bulkDeleteExamTasksAction(
  ids: string[],
): Promise<ActionResult> {
  await requireAdminOrTeacher();
  const result = await runBulk(
    ids,
    async (id) => {
      const task = await getExamTaskAdmin(id);
      if (task?.status === 'published') throw new Error('published');
      await deleteExamTask(id);
    },
    'Deleted',
  );
  revalidatePath('/tasks');
  return result;
}
