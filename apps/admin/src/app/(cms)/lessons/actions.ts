'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createLesson,
  updateLesson,
  getLessonById,
  publishLesson,
  unpublishLesson,
  deleteLesson,
} from '@bandzen/db/queries';
import type {
  Lesson,
  LessonBlock,
  LessonStage,
  LessonStageId,
} from '@bandzen/db/schema';
import { ContentInUseError, PublishValidationError } from '@bandzen/db/errors';
import { requireAdminOrTeacher } from '@/lib/auth';

export type ActionState = { error: string | null };

function orNull(value: FormDataEntryValue | null) {
  const s = String(value ?? '').trim();
  return s || null;
}

function splitLines(value: FormDataEntryValue | null): string[] {
  return String(value ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
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
  redirect(`/lessons/${lesson.id}`);
}

export async function updateLessonAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  await updateLesson(
    id,
    {
      title: String(formData.get('title') ?? '').trim(),
      summary: String(formData.get('summary') ?? '').trim(),
      minutes: Number(formData.get('minutes') ?? 5),
      questionKind: orNull(
        formData.get('questionKind'),
      ) as Lesson['questionKind'],
    },
    userId,
  );
  revalidatePath(`/lessons/${id}`);
}

export async function publishLessonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { userId } = await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await publishLesson(id, userId);
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
  revalidatePath(`/lessons/${id}`);
  revalidatePath('/lessons');
}

export async function deleteLessonAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminOrTeacher();
  const id = String(formData.get('id') ?? '');
  try {
    await deleteLesson(id);
  } catch (e) {
    if (e instanceof ContentInUseError) return { error: e.message };
    throw e;
  }
  revalidatePath('/lessons');
  redirect('/lessons');
}

/**
 * Every stage/block mutation is a read-modify-write of the whole `stages`
 * JSON blob -- there is no per-block DB operation (see packages/db). This is
 * the one place that fetch-modify-save boilerplate lives.
 */
async function withStages(
  lessonId: string,
  userId: string,
  mutate: (stages: LessonStage[]) => LessonStage[],
) {
  const lesson = await getLessonById(lessonId);
  if (!lesson) return;
  const stages = mutate([...(lesson.stages ?? [])] as LessonStage[]);
  await updateLesson(lessonId, { stages }, userId);
  revalidatePath(`/lessons/${lessonId}`);
}

export async function addStageAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const lessonId = String(formData.get('lessonId') ?? '');
  const stageId = formData.get('stageId') as LessonStageId;
  await withStages(lessonId, userId, (stages) =>
    stages.some((s) => s.id === stageId)
      ? stages
      : [...stages, { id: stageId, blocks: [] }],
  );
}

export async function deleteStageAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const lessonId = String(formData.get('lessonId') ?? '');
  const stageId = formData.get('stageId') as LessonStageId;
  await withStages(lessonId, userId, (stages) =>
    stages.filter((s) => s.id !== stageId),
  );
}

/** Builds the block sub-object for the selected kind, ignoring every other field on the shared "add block" form. */
function buildBlock(formData: FormData): LessonBlock | null {
  const kind = String(formData.get('kind') ?? '');
  switch (kind) {
    case 'prose':
      return { kind: 'prose', body: String(formData.get('body') ?? '').trim() };
    case 'steps':
      return { kind: 'steps', items: splitLines(formData.get('items')) };
    case 'checklist':
      return { kind: 'checklist', items: splitLines(formData.get('items')) };
    case 'callout':
      return {
        kind: 'callout',
        tone: formData.get('calloutTone') === 'warning' ? 'warning' : 'note',
        title: String(formData.get('title') ?? '').trim(),
        body: String(formData.get('body') ?? '').trim(),
      };
    case 'example':
      return {
        kind: 'example',
        source: String(formData.get('source') ?? '').trim(),
        question: String(formData.get('question') ?? '').trim(),
        answer: String(formData.get('answer') ?? '').trim(),
        why: String(formData.get('why') ?? '').trim(),
      };
    case 'try':
      return {
        kind: 'try',
        source: orNull(formData.get('source')) ?? undefined,
        question: String(formData.get('question') ?? '').trim(),
        answer: String(formData.get('answer') ?? '').trim(),
        why: String(formData.get('why') ?? '').trim(),
      };
    default:
      return null;
  }
}

export async function addBlockAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const lessonId = String(formData.get('lessonId') ?? '');
  const stageId = formData.get('stageId') as LessonStageId;
  const block = buildBlock(formData);
  if (!block) return;
  await withStages(lessonId, userId, (stages) => {
    const existing = stages.find((s) => s.id === stageId);
    if (existing) {
      return stages.map((s) =>
        s.id === stageId ? { ...s, blocks: [...s.blocks, block] } : s,
      );
    }
    return [...stages, { id: stageId, blocks: [block] }];
  });
}

export async function deleteBlockAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const lessonId = String(formData.get('lessonId') ?? '');
  const stageId = formData.get('stageId') as LessonStageId;
  const index = Number(formData.get('index') ?? -1);
  await withStages(lessonId, userId, (stages) =>
    stages.map((s) =>
      s.id === stageId
        ? { ...s, blocks: s.blocks.filter((_, i) => i !== index) }
        : s,
    ),
  );
}

export async function moveBlockAction(formData: FormData) {
  const { userId } = await requireAdminOrTeacher();
  const lessonId = String(formData.get('lessonId') ?? '');
  const stageId = formData.get('stageId') as LessonStageId;
  const index = Number(formData.get('index') ?? -1);
  const direction = String(formData.get('direction') ?? '');
  const target = direction === 'up' ? index - 1 : index + 1;

  await withStages(lessonId, userId, (stages) =>
    stages.map((s) => {
      if (s.id !== stageId) return s;
      if (target < 0 || target >= s.blocks.length) return s;
      const blocks = [...s.blocks];
      [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
      return { ...s, blocks };
    }),
  );
}
