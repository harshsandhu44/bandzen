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
  recordContentEvent,
  duplicateTrack,
} from '@bandzen/db/queries';
import { ContentInUseError, PublishValidationError } from '@bandzen/db/errors';
import { computePeaks, wholeSeconds } from '@bandzen/ai/speech';
import { deleteObject, uploadObject } from '@bandzen/storage/r2';
import { requireAdminOrTeacher } from '@/lib/auth';
import { runBulk } from '@/lib/bulk';
import { ok, fail, type ActionResult } from '@/lib/action-result';
import { saveTrackPayloadSchema, type SaveTrackPayload } from './[id]/schema';

export type ActionState = { error: string | null };

/**
 * Decodes the posted MP3, uploads it to R2, and returns its public URL with
 * the waveform peaks and duration read off the same decode — or null when no
 * file was attached. A fresh UUID key every time, so replacing a track's audio
 * never has to worry about a stale CDN copy under the old key.
 *
 * Decodes before uploading: a file that doesn't decode (duration 0) would
 * otherwise reach mocks with a zero-length deadline, so it's rejected with
 * nothing sent to R2.
 */
async function uploadAudio(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;
  const body = Buffer.from(await file.arrayBuffer());
  const { peaks, durationSeconds } = await computePeaks(body);
  if (durationSeconds === 0) {
    throw new Error("Couldn't read that MP3 — check the file.");
  }
  const key = `listening/${crypto.randomUUID()}.mp3`;
  const audioUrl = await uploadObject({
    key,
    body,
    contentType: file.type || 'audio/mpeg',
  });
  return {
    key,
    audioUrl,
    peaks,
    durationSeconds: wholeSeconds(durationSeconds),
  };
}

/** Runs the DB write for an upload; if it throws, deletes the object so it isn't orphaned in R2. */
async function persistOrDelete<T>(
  key: string | undefined,
  write: () => Promise<T>,
): Promise<T> {
  try {
    return await write();
  } catch (e) {
    if (key) await deleteObject(key).catch(() => {});
    throw e;
  }
}

export async function createTrackAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const transcript = String(formData.get('transcript') ?? '').trim() || null;
  const audio = await uploadAudio(formData.get('audio'));
  if (!transcript && !audio) {
    throw new Error('Provide a transcript, an MP3, or both.');
  }
  const track = await persistOrDelete(audio?.key, async () => {
    const created = await createTrack({
      slug: String(formData.get('slug') ?? '').trim(),
      title: String(formData.get('title') ?? '').trim(),
      topic: String(formData.get('topic') ?? '').trim() || null,
      transcript,
      difficulty: Number(formData.get('difficulty') ?? 3),
      audioUrl: audio?.audioUrl ?? null,
      peaks: audio?.peaks ?? null,
      durationSeconds: audio?.durationSeconds ?? null,
      updatedBy: userId,
    });
    if (!created) throw new Error('Failed to create track.');
    return created;
  });
  await recordContentEvent('listening-track', track.id, userId, 'created');
  redirect(`/listening/${track.id}`);
}

export async function replaceAudioAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  const audio = await uploadAudio(formData.get('audio'));
  if (!audio) throw new Error('Choose an MP3 file to upload.');
  const { key, ...fields } = audio;
  await persistOrDelete(key, () => updateTrack(id, fields, userId));
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
    await recordContentEvent('listening-track', id, userId, 'published');
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
  await recordContentEvent('listening-track', id, userId, 'unpublished');
  revalidatePath(`/listening/${id}`);
  revalidatePath('/listening');
}

export async function deleteTrackAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await deleteTrack(id);
  } catch (e) {
    if (e instanceof ContentInUseError) return { error: e.message };
    throw e;
  }
  await recordContentEvent('listening-track', id, userId, 'deleted');
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

    await recordContentEvent('listening-track', p.id, userId, 'updated');
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
  const result = await runBulk(
    ids,
    (id) => publishTrack(id, userId),
    'Published',
  );
  revalidatePath('/listening');
  return result;
}

export async function bulkUnpublishTracksAction(
  ids: string[],
): Promise<ActionResult> {
  const { userId } = await requireAdminOrTeacher();
  const result = await runBulk(
    ids,
    (id) => unpublishTrack(id, userId),
    'Unpublished',
  );
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

/** Sat content is locked (#120); a fix starts from a fresh draft copy. */
export async function duplicateTrackAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const copy = await duplicateTrack(String(formData.get('id') ?? ''), userId);
  if (!copy) throw new Error('That track no longer exists.');
  await recordContentEvent('listening-track', copy.id, userId, 'created');
  revalidatePath('/listening');
  redirect(`/listening/${copy.id}`);
}
