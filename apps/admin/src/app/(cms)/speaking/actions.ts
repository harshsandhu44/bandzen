'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createSpeakingPrompt,
  createSpeakingTest,
  deleteSpeakingPrompt,
  deleteSpeakingTest,
  getSpeakingTestAdmin,
  publishSpeakingTest,
  unpublishSpeakingTest,
  updateSpeakingPrompt,
  updateSpeakingTest,
  recordContentEvent,
} from '@bandzen/db/queries';
import { ContentInUseError, PublishValidationError } from '@bandzen/db/errors';
import { requireAdminOrTeacher } from '@/lib/auth';
import { runBulk } from '@/lib/bulk';
import { ok, fail, type ActionResult } from '@/lib/action-result';
import {
  saveSpeakingPayloadSchema,
  type SaveSpeakingPayload,
} from './[id]/schema';

export type ActionState = { error: string | null };


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
  await recordContentEvent('speaking-test', test.id, userId, 'created');
  redirect(`/speaking/${test.id}`);
}



export async function publishTestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await publishSpeakingTest(id, userId);
    await recordContentEvent('speaking-test', id, userId, 'published');
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
  await recordContentEvent('speaking-test', id, userId, 'unpublished');
  revalidatePath(`/speaking/${id}`);
  revalidatePath('/speaking');
}

export async function deleteTestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await deleteSpeakingTest(id);
  } catch (e) {
    if (e instanceof ContentInUseError) return { error: e.message };
    throw e;
  }
  await recordContentEvent('speaking-test', id, userId, 'deleted');
  revalidatePath('/speaking');
  redirect('/speaking');
}




/**
 * One Save for the speaking editor: the test fields plus its full prompt list.
 * Prompts are diffed against what is stored. When a prompt's text changes its
 * examiner audio is cleared, so the editor's generation poll re-synthesizes it
 * — no separate "regenerate" step.
 */
export async function saveSpeakingTestAction(
  payload: SaveSpeakingPayload,
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();

  const parsed = saveSpeakingPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return fail('Some fields are invalid — check the highlighted ones.');
  }
  const p = parsed.data;

  try {
    await updateSpeakingTest(
      p.id,
      { title: p.title, topic: p.topic, difficulty: p.difficulty },
      userId,
    );

    const existing = await getSpeakingTestAdmin(p.id);
    if (!existing) return fail('That test no longer exists.');
    const byId = new Map(existing.prompts.map((pr) => [pr.id, pr]));

    const keep = new Set(
      p.prompts.filter((pr) => pr.id).map((pr) => pr.id as string),
    );
    for (const pr of existing.prompts) {
      if (!keep.has(pr.id)) await deleteSpeakingPrompt(pr.id);
    }

    for (const pr of p.prompts) {
      if (pr.id) {
        const prev = byId.get(pr.id);
        await updateSpeakingPrompt(pr.id, {
          idx: pr.idx,
          part: pr.part,
          text: pr.text,
          cueCardPoints: pr.cueCardPoints,
          prepSeconds: pr.prepSeconds,
          ...(prev && prev.text !== pr.text ? { audioUrl: null } : {}),
        });
      } else {
        await createSpeakingPrompt(p.id, {
          idx: pr.idx,
          part: pr.part,
          text: pr.text,
          cueCardPoints: pr.cueCardPoints,
          prepSeconds: pr.prepSeconds,
        });
      }
    }

    await recordContentEvent('speaking-test', p.id, userId, 'updated');
    revalidatePath(`/speaking/${p.id}`);
    revalidatePath('/speaking');
    return ok('Saved');
  } catch (e) {
    console.error('[cms] saveSpeakingTest failed', e);
    return fail(e instanceof Error ? e.message : 'Could not save the test.');
  }
}

export async function bulkPublishTestsAction(
  ids: string[],
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => publishSpeakingTest(id, userId), 'Published');
  revalidatePath('/speaking');
  return result;
}

export async function bulkUnpublishTestsAction(
  ids: string[],
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => unpublishSpeakingTest(id, userId), 'Unpublished');
  revalidatePath('/speaking');
  return result;
}

export async function bulkDeleteTestsAction(
  ids: string[],
): Promise<ActionResult> {
  await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => deleteSpeakingTest(id), 'Deleted');
  revalidatePath('/speaking');
  return result;
}
