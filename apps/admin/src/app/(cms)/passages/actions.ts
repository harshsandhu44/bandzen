'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createPassage,
  updatePassage,
  publishPassage,
  unpublishPassage,
  deletePassage,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getPassageAdmin,
} from '@bandzen/db/queries';
import { ContentInUseError, PublishValidationError } from '@bandzen/db/errors';
import { requireAdminOrTeacher } from '@/lib/auth';
import { runBulk } from '@/lib/bulk';
import { ok, fail, type ActionResult } from '@/lib/action-result';
import {
  savePassagePayloadSchema,
  type SavePassagePayload,
} from './[id]/schema';

export type ActionState = { error: string | null };

export async function createPassageAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const passage = await createPassage({
    slug: String(formData.get('slug') ?? '').trim(),
    title: String(formData.get('title') ?? '').trim(),
    body: String(formData.get('body') ?? '').trim(),
    topic: String(formData.get('topic') ?? '').trim() || null,
    format: (formData.get('format') as 'academic' | 'general') ?? 'academic',
    difficulty: Number(formData.get('difficulty') ?? 3),
    updatedBy: userId,
  });
  if (!passage) throw new Error('Failed to create passage.');
  redirect(`/passages/${passage.id}`);
}


export async function publishPassageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await publishPassage(id, userId);
  } catch (e) {
    if (e instanceof PublishValidationError)
      return { error: `Missing: ${e.issues.join(', ')}` };
    throw e;
  }
  revalidatePath(`/passages/${id}`);
  revalidatePath('/passages');
  return { error: null };
}

export async function unpublishPassageAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  await unpublishPassage(id, userId);
  revalidatePath(`/passages/${id}`);
  revalidatePath('/passages');
}

export async function deletePassageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await deletePassage(id);
  } catch (e) {
    if (e instanceof ContentInUseError) return { error: e.message };
    throw e;
  }
  revalidatePath('/passages');
  redirect('/passages');
}




/**
 * One Save for the whole passage editor: the passage fields plus its full
 * question list. Questions are diffed against what is stored — rows dropped
 * from the form are deleted, rows with an id are updated, rows without one are
 * created. Sequential, not transactional (neon-http), same as the importer.
 */
export async function savePassageAction(
  payload: SavePassagePayload,
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();

  const parsed = savePassagePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return fail('Some fields are invalid — check the highlighted ones.');
  }
  const p = parsed.data;

  try {
    await updatePassage(
      p.id,
      {
        title: p.title,
        body: p.body,
        topic: p.topic,
        format: p.format,
        difficulty: p.difficulty,
        headings: p.headings.length > 0 ? p.headings : null,
      },
      userId,
    );

    const existing = await getPassageAdmin(p.id);
    if (!existing) return fail('That passage no longer exists.');

    const keep = new Set(
      p.questions.filter((q) => q.id).map((q) => q.id as string),
    );
    for (const q of existing.questions) {
      if (!keep.has(q.id)) await deleteQuestion(q.id);
    }

    for (const q of p.questions) {
      const fields = {
        idx: q.idx,
        kind: q.kind,
        prompt: q.prompt,
        options: q.options,
        evidence: q.evidence,
        explanation: q.explanation,
        answer: q.answer,
      };
      if (q.id) await updateQuestion(q.id, fields);
      else await createQuestion({ passageId: p.id }, fields);
    }

    revalidatePath(`/passages/${p.id}`);
    revalidatePath('/passages');
    return ok('Saved');
  } catch (e) {
    console.error('[cms] savePassage failed', e);
    return fail(e instanceof Error ? e.message : 'Could not save the passage.');
  }
}

export async function bulkPublishPassagesAction(
  ids: string[],
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => publishPassage(id, userId), 'Published');
  revalidatePath('/passages');
  return result;
}

export async function bulkUnpublishPassagesAction(
  ids: string[],
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => unpublishPassage(id, userId), 'Unpublished');
  revalidatePath('/passages');
  return result;
}

export async function bulkDeletePassagesAction(
  ids: string[],
): Promise<ActionResult> {
  await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => deletePassage(id), 'Deleted');
  revalidatePath('/passages');
  return result;
}
