'use server';

import { after } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { getExam, getTask } from '@bandzen/exams/registry';
import { uploadObject } from '@bandzen/storage/r2';
import { gradeExamTask } from '@/lib/ai/grade-exam-task';
import { requireContentRole, requireUserId } from '@/lib/auth';
import {
  createExamTaskAttempt,
  findInProgressExamTask,
  getAttempt,
  getPublishedExamTasks,
  saveExamTaskResponse,
  submitExamTaskAttempt,
} from '@/lib/db/queries';

/**
 * Server actions for a task session.
 *
 * Every one re-runs `requireContentRole`. PTE is not open to students until its
 * scoring lands (#96), and a gate that only the page checks is not a gate —
 * these are POST endpoints a browser can reach directly.
 *
 * ponytail: no practice quota here yet. `practiceAllowance` counts IELTS
 * modules, and while this is staff-only there is nobody to meter. #96 opens it
 * to students and is where the entitlement check belongs.
 */

/** Items in one practice session. Real PTE sections are longer; #96 sizes them. */
const ITEMS_PER_SESSION = 3;

export async function startExamTaskAttempt(formData: FormData) {
  await requireContentRole();
  const examKey = String(formData.get('exam') ?? '');
  const taskKey = String(formData.get('task') ?? '');

  const exam = getExam(examKey);
  const task = getTask(examKey, taskKey);
  if (!exam || !task) notFound();

  const userId = await requireUserId();

  // Resume rather than stack up abandoned attempts on the same task type.
  const existing = await findInProgressExamTask(userId, exam.key, task.key);
  if (existing) redirect(`/practice/${exam.key}/${task.key}/${existing.id}`);

  const items = await getPublishedExamTasks(
    exam.key,
    task.key,
    ITEMS_PER_SESSION,
  );
  if (!items.length) notFound();

  const attempt = await createExamTaskAttempt({
    userId,
    examKey: exam.key,
    examVersion: exam.version,
    taskType: task.key,
    // The skill the attempt counts as. A task measuring several — PTE's are
    // mostly integrated — records all of them in its assessment; this is only
    // which column of the dashboard it sits in.
    module: task.measuredSkills[0]!,
    taskIds: items.map((i) => i.id),
  });

  redirect(`/practice/${exam.key}/${task.key}/${attempt.id}`);
}

export async function saveExamTaskAnswer(input: {
  attemptId: string;
  taskId: string;
  value: string;
}) {
  await requireContentRole();
  const userId = await requireUserId();
  await saveExamTaskResponse(userId, input.attemptId, input.taskId, {
    value: input.value,
  });
}

/**
 * Store one recorded take against its task.
 *
 * The same contract the Speaking module keeps: the WAV is posted the moment
 * the recording stops, so a refresh mid-session loses nothing, and R2 gets a
 * fresh key every time so re-recording never races a stale CDN copy.
 *
 * The RIFF/WAVE header is checked at this trust boundary because a
 * header-only or malformed file is exactly the "recording came back empty"
 * bug, and it is cheaper to reject it here than to hand it to a grader.
 */
export async function saveExamTaskRecording(
  formData: FormData,
): Promise<{ ok: boolean; url: string | null }> {
  await requireContentRole();
  const userId = await requireUserId();
  const attemptId = String(formData.get('attemptId') ?? '');
  const taskId = String(formData.get('taskId') ?? '');
  const file = formData.get('audio');

  if (!attemptId || !taskId || !(file instanceof File) || file.size === 0) {
    return { ok: false, url: null };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const isWav =
    bytes.length > 44 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WAVE';
  if (!isWav) return { ok: false, url: null };

  const url = await uploadObject({
    key: `exam-tasks/${crypto.randomUUID()}.wav`,
    body: bytes,
    contentType: 'audio/wav',
  });

  await saveExamTaskResponse(userId, attemptId, taskId, { audioUrl: url });
  return { ok: true, url };
}

export async function submitExamTaskSession(formData: FormData) {
  await requireContentRole();
  const attemptId = String(formData.get('attemptId') ?? '');
  if (!attemptId) throw new Error('Missing attempt');

  const userId = await requireUserId();
  const graded = await submitExamTaskAttempt(userId, attemptId);
  if (!graded) throw new Error('Attempt not found');

  // Hand back the review page immediately and grade past the response, the
  // same shape `submitEssay` and `submitSpeakingAttempt` use.
  if (graded.needsModel) after(() => gradeExamTask(attemptId));

  // The review URL is rebuilt from the attempt row rather than from a hidden
  // field, so a hand-edited form cannot send someone into another task's review.
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.taskType) throw new Error('Attempt not found');

  redirect(
    `/practice/${attempt.examKey}/${attempt.taskType}/${attempt.id}/review`,
  );
}
