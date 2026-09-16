'use server';

import { after } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { getExam, getTask } from '@bandzen/exams/registry';
import { uploadObject } from '@bandzen/storage/r2';
import { gradeExamTask } from '@/lib/ai/grade-exam-task';
import { requireUserId } from '@/lib/auth';
import { finishSittingSection } from '@/lib/mock-guard';
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
 * ponytail: no practice quota here yet. `practiceAllowance` counts IELTS
 * modules by name, so metering these needs a per-exam allowance rather than a
 * fourth hardcoded module. Sittings are already metered by `mockAllowance`.
 */

/** Items in one practice session. Real PTE sections are longer; #96 sizes them. */
const ITEMS_PER_SESSION = 3;

export async function startExamTaskAttempt(formData: FormData) {
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

  // A sitting section hands back to the sitting rather than to this task's
  // review: the candidate is mid-mock, and what comes next is the next task or
  // the next part, not a result they cannot act on yet.
  if (attempt.mockAttemptId) {
    await finishSittingSection(userId, attempt.mockAttemptId);
  }

  redirect(
    `/practice/${attempt.examKey}/${attempt.taskType}/${attempt.id}/review`,
  );
}
