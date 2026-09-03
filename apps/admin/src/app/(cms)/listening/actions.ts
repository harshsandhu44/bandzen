'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createTrack,
  updateTrack,
  publishTrack,
  unpublishTrack,
  deleteTrack,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getTrackAdmin,
} from '@bandzen/db/queries';
import { ContentInUseError, PublishValidationError } from '@bandzen/db/errors';
import { uploadObject } from '@bandzen/storage/r2';
import { requireAdminOrTeacher } from '@/lib/auth';
import { runBulk } from '@/lib/bulk';
import { ok, fail, type ActionResult } from '@/lib/action-result';
import { saveTrackPayloadSchema, type SaveTrackPayload } from './[id]/schema';

export type ActionState = { error: string | null };



/**
 * Uploads the posted MP3 to R2 and returns its public URL, or null when no
 * file was attached. A fresh UUID key every time, so replacing a track's audio
 * never has to worry about a stale CDN copy under the old key.
 */
async function uploadAudio(
  file: FormDataEntryValue | null,
): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  const body = Buffer.from(await file.arrayBuffer());
  return uploadObject({
    key: `listening/${crypto.randomUUID()}.mp3`,
    body,
    contentType: file.type || 'audio/mpeg',
  });
}

export async function createTrackAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const transcript = String(formData.get('transcript') ?? '').trim() || null;
  const audioUrl = await uploadAudio(formData.get('audio'));
  if (!transcript && !audioUrl) {
    throw new Error('Provide a transcript, an MP3, or both.');
  }
  const track = await createTrack({
    slug: String(formData.get('slug') ?? '').trim(),
    title: String(formData.get('title') ?? '').trim(),
    topic: String(formData.get('topic') ?? '').trim() || null,
    transcript,
    difficulty: Number(formData.get('difficulty') ?? 3),
    audioUrl,
    updatedBy: userId,
  });
  if (!track) throw new Error('Failed to create track.');
  redirect(`/listening/${track.id}`);
}


export async function replaceAudioAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  const audioUrl = await uploadAudio(formData.get('audio'));
  if (!audioUrl) throw new Error('Choose an MP3 file to upload.');
  await updateTrack(id, { audioUrl }, userId);
  revalidatePath(`/listening/${id}`);
}

/**
 * Drop the current audio and let the edit page's generation poll re-synthesize
 * it from the (presumably just-edited) transcript. One generation code path,
 * in the API route — this only clears the fields it keys off.
 */
export async function regenerateAudioAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  await updateTrack(
    id,
    { audioUrl: null, generationError: null, generationStartedAt: null },
    userId,
  );
  revalidatePath(`/listening/${id}`);
}

export async function publishTrackAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await publishTrack(id, userId);
  } catch (e) {
    if (e instanceof PublishValidationError)
      return { error: `Missing: ${e.issues.join(', ')}` };
    throw e;
  }
  revalidatePath(`/listening/${id}`);
  revalidatePath('/listening');
  return { error: null };
}

export async function unpublishTrackAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  await unpublishTrack(id, userId);
  revalidatePath(`/listening/${id}`);
  revalidatePath('/listening');
}

export async function deleteTrackAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await deleteTrack(id);
  } catch (e) {
    if (e instanceof ContentInUseError) return { error: e.message };
    throw e;
  }
  revalidatePath('/listening');
  redirect('/listening');
}




/**
 * One Save for the listening editor: track fields plus its full question list.
 * Questions are diffed against what is stored (shared question queries, keyed
 * by trackId). Audio stays a separate upload; the generation poll fills in a
 * missing transcript or audio file.
 */
export async function saveTrackAction(
  payload: SaveTrackPayload,
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();

  const parsed = saveTrackPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return fail('Some fields are invalid — check the highlighted ones.');
  }
  const p = parsed.data;

  try {
    await updateTrack(
      p.id,
      {
        title: p.title,
        topic: p.topic,
        difficulty: p.difficulty,
        transcript: p.transcript,
        matchingOptions: p.matchingOptions,
      },
      userId,
    );

    const existing = await getTrackAdmin(p.id);
    if (!existing) return fail('That track no longer exists.');

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
      else await createQuestion({ trackId: p.id }, fields);
    }

    revalidatePath(`/listening/${p.id}`);
    revalidatePath('/listening');
    return ok('Saved');
  } catch (e) {
    console.error('[cms] saveTrack failed', e);
    return fail(e instanceof Error ? e.message : 'Could not save the track.');
  }
}

export async function bulkPublishTracksAction(
  ids: string[],
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => publishTrack(id, userId), 'Published');
  revalidatePath('/listening');
  return result;
}

export async function bulkUnpublishTracksAction(
  ids: string[],
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => unpublishTrack(id, userId), 'Unpublished');
  revalidatePath('/listening');
  return result;
}

export async function bulkDeleteTracksAction(
  ids: string[],
): Promise<ActionResult> {
  await requireAdminOrTeacher();
  const result = await runBulk(ids, (id) => deleteTrack(id), 'Deleted');
  revalidatePath('/listening');
  return result;
}
