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
} from '@bandzen/db/queries';
import type { Question } from '@bandzen/db/schema';
import { ContentInUseError, PublishValidationError } from '@bandzen/db/errors';
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

export async function updatePassageAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  await updatePassage(
    id,
    {
      title: String(formData.get('title') ?? '').trim(),
      body: String(formData.get('body') ?? '').trim(),
      topic: String(formData.get('topic') ?? '').trim() || null,
      format: (formData.get('format') as 'academic' | 'general') ?? 'academic',
      difficulty: Number(formData.get('difficulty') ?? 3),
      headings: splitLines(formData.get('headings')),
    },
    userId,
  );
  revalidatePath(`/passages/${id}`);
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

export async function createQuestionAction(formData: FormData) {
  await requireAdminOrTeacher();
  const passageId = String(formData.get('passageId') ?? '');
  await createQuestion(passageId, {
    idx: Number(formData.get('idx') ?? 0),
    kind: formData.get('kind') as Question['kind'],
    prompt: String(formData.get('prompt') ?? '').trim(),
    options: splitLines(formData.get('options')),
    evidence: String(formData.get('evidence') ?? '').trim() || null,
    explanation: String(formData.get('explanation') ?? '').trim() || null,
    answer: splitCommas(formData.get('answer')),
  });
  revalidatePath(`/passages/${passageId}`);
}

export async function updateQuestionAction(formData: FormData) {
  await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  const passageId = String(formData.get('passageId') ?? '');
  await updateQuestion(id, {
    idx: Number(formData.get('idx') ?? 0),
    kind: formData.get('kind') as Question['kind'],
    prompt: String(formData.get('prompt') ?? '').trim(),
    options: splitLines(formData.get('options')),
    evidence: String(formData.get('evidence') ?? '').trim() || null,
    explanation: String(formData.get('explanation') ?? '').trim() || null,
    answer: splitCommas(formData.get('answer')),
  });
  revalidatePath(`/passages/${passageId}`);
}

export async function deleteQuestionAction(formData: FormData) {
  await requireAdminOrTeacher();
  const passageId = String(formData.get('passageId') ?? '');
  await deleteQuestion(String(formData.get('id') ?? ''));
  revalidatePath(`/passages/${passageId}`);
}
