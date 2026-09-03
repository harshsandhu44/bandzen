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
} from '@bandzen/db/queries';
import type { Question } from '@bandzen/db/schema';
import { ContentInUseError, PublishValidationError } from '@bandzen/db/errors';
import { uploadObject } from '@bandzen/storage/r2';
import { requireAdminOrTeacher } from '@/lib/auth';

export type ActionState = { error: string | null };

/** Multi-line textarea -> string[] (one entry per non-blank line). */
function splitLines(value: FormDataEntryValue | null): string[] | null {
  const lines = String(value ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : null;
}

/** Comma-separated field -> string[], for the (usually one-entry) answer key. */
function splitCommas(value: FormDataEntryValue | null): string[] {
  return String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Uploads the posted MP3 to R2 and returns its public URL. A fresh UUID key
 * every time, so replacing a track's audio never has to worry about a stale
 * CDN copy under the old key — the row just points somewhere new.
 */
async function uploadAudio(file: FormDataEntryValue | null): Promise<string> {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error('Choose an MP3 file for the audio.');
  }
  const body = Buffer.from(await file.arrayBuffer());
  return uploadObject({
    key: `listening/${crypto.randomUUID()}.mp3`,
    body,
    contentType: file.type || 'audio/mpeg',
  });
}

export async function createTrackAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const audioUrl = await uploadAudio(formData.get('audio'));
  const track = await createTrack({
    slug: String(formData.get('slug') ?? '').trim(),
    title: String(formData.get('title') ?? '').trim(),
    topic: String(formData.get('topic') ?? '').trim() || null,
    transcript: String(formData.get('transcript') ?? '').trim(),
    difficulty: Number(formData.get('difficulty') ?? 3),
    audioUrl,
    updatedBy: userId,
  });
  if (!track) throw new Error('Failed to create track.');
  redirect(`/listening/${track.id}`);
}

export async function updateTrackAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  await updateTrack(
    id,
    {
      title: String(formData.get('title') ?? '').trim(),
      topic: String(formData.get('topic') ?? '').trim() || null,
      transcript: String(formData.get('transcript') ?? '').trim(),
      difficulty: Number(formData.get('difficulty') ?? 3),
      matchingOptions: splitLines(formData.get('matchingOptions')),
    },
    userId,
  );
  revalidatePath(`/listening/${id}`);
}

export async function replaceAudioAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  const audioUrl = await uploadAudio(formData.get('audio'));
  await updateTrack(id, { audioUrl }, userId);
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

export async function createQuestionAction(formData: FormData) {
  await requireAdminOrTeacher();
  const trackId = String(formData.get('trackId') ?? '');
  await createQuestion(
    { trackId },
    {
      idx: Number(formData.get('idx') ?? 0),
      kind: formData.get('kind') as Question['kind'],
      prompt: String(formData.get('prompt') ?? '').trim(),
      options: splitLines(formData.get('options')),
      evidence: String(formData.get('evidence') ?? '').trim() || null,
      explanation: String(formData.get('explanation') ?? '').trim() || null,
      answer: splitCommas(formData.get('answer')),
    },
  );
  revalidatePath(`/listening/${trackId}`);
}

export async function updateQuestionAction(formData: FormData) {
  await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  const trackId = String(formData.get('trackId') ?? '');
  await updateQuestion(id, {
    idx: Number(formData.get('idx') ?? 0),
    kind: formData.get('kind') as Question['kind'],
    prompt: String(formData.get('prompt') ?? '').trim(),
    options: splitLines(formData.get('options')),
    evidence: String(formData.get('evidence') ?? '').trim() || null,
    explanation: String(formData.get('explanation') ?? '').trim() || null,
    answer: splitCommas(formData.get('answer')),
  });
  revalidatePath(`/listening/${trackId}`);
}

export async function deleteQuestionAction(formData: FormData) {
  await requireAdminOrTeacher();
  const trackId = String(formData.get('trackId') ?? '');
  await deleteQuestion(String(formData.get('id') ?? ''));
  revalidatePath(`/listening/${trackId}`);
}
