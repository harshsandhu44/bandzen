'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createLesson,
  updateLesson,
  publishLesson,
  unpublishLesson,
  deleteLesson,
  recordContentEvent,
} from '@bandzen/db/queries';
import type { Lesson } from '@bandzen/db/schema';
import { ContentInUseError, PublishValidationError } from '@bandzen/db/errors';
import { requireAdminOrTeacher } from '@/lib/auth';
import { runBulk } from '@/lib/bulk';
import { ok, fail, type ActionResult } from '@/lib/action-result';
import {
  saveLessonPayloadSchema,
  type SaveLessonPayload,
} from './[id]/schema';

export type ActionState = { error: string | null };

function orNull(value: FormDataEntryValue | null) {
  const s = String(value ?? '').trim();
  return s || null;
}


export async function createLessonAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const lesson = await createLesson({
    slug: String(formData.get('slug') ?? '').trim(),
    module: formData.get('module') as Lesson['module'],
    group: formData.get('group') as Lesson['group'],
    title: String(formData.get('title') ?? '').trim(),
    summary: String(formData.get('summary') ?? '').trim(),
    minutes: Number(formData.get('minutes') ?? 5),
    questionKind: orNull(
      formData.get('questionKind'),
    ) as Lesson['questionKind'],
    updatedBy: userId,
  });
  if (!lesson) throw new Error('Failed to create lesson.');
  await recordContentEvent('lesson', lesson.id, userId, 'created');
  redirect(`/lessons/${lesson.id}`);
}


export async function publishLessonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await publishLesson(id, userId);
    await recordContentEvent('lesson', id, userId, 'published');
  } catch (e) {
    if (e instanceof PublishValidationError)
      return { error: `Missing: ${e.issues.join(', ')}` };
    throw e;
  }
  revalidatePath(`/lessons/${id}`);
  revalidatePath('/lessons');
  return { error: null };
}

export async function unpublishLessonAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  await unpublishLesson(id, userId);
  await recordContentEvent('lesson', id, userId, 'unpublished');
  revalidatePath(`/lessons/${id}`);
  revalidatePath('/lessons');
}

export async function deleteLessonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await deleteLesson(id);
  } catch (e) {
    if (e instanceof ContentInUseError) return { error: e.message };
    throw e;
  }
  await recordContentEvent('lesson', id, userId, 'deleted');
  revalidatePath('/lessons');
  redirect('/lessons');
}








/**
 * One Save for the lesson editor. The whole `stages` array is a single JSON
 * blob on the row, so there is no child-row diffing — the payload replaces it
 * wholesale.
 */
export async function saveLessonAction(
  payload: SaveLessonPayload,
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();

  const parsed = saveLessonPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return fail('Some fields are invalid — check the highlighted ones.');
  }
  const p = parsed.data;

  try {
    await updateLesson(
      p.id,
      {
        title: p.title,
        summary: p.summary,
        minutes: p.minutes,
        questionKind: p.questionKind as Lesson['questionKind'],
        stages: p.stages.length > 0 ? p.stages : null,
      },
      userId,
    );
    await recordContentEvent('lesson', p.id, userId, 'updated');
    revalidatePath(`/lessons/${p.id}`);
    revalidatePath('/lessons');
    return ok('Saved');
  } catch (e) {
    console.error('[cms] saveLesson failed', e);
    return fail(e instanceof Error ? e.message : 'Could not save the lesson.');
  }
}

export async function bulkPublishLessonsAction(
  ids: string[],
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => publishLesson(id, userId), 'Published');
  revalidatePath('/lessons');
  return result;
}

export async function bulkUnpublishLessonsAction(
  ids: string[],
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => unpublishLesson(id, userId), 'Unpublished');
  revalidatePath('/lessons');
  return result;
}

export async function bulkDeleteLessonsAction(
  ids: string[],
): Promise<ActionResult> {
  await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => deleteLesson(id), 'Deleted');
  revalidatePath('/lessons');
  return result;
}
