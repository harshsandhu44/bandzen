'use server';

import { after } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { getExam, getTask } from '@bandzen/exams/registry';
import { uploadObject } from '@bandzen/storage/r2';
import { gradeExamTask } from '@/lib/ai/grade-exam-task';
import { requireUserId } from '@/lib/auth';
import {
  expireMockSectionIfDue,
  finishSittingSection,
  mockSectionClock,
} from '@/lib/mock-guard';
import { skillForTaskType } from '@/lib/exam-sitting';
import { acceptsWrite } from '@/lib/task-session';
import {
  completeExamTaskItem,
  createExamTaskAttempt,
  findInProgressExamTask,
  linkAttemptToAssignment,
  getAttempt,
  getMockSectionAttempts,
  getPublishedExamTasks,
  markExamTaskStimulusStarted,
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

  // The plan assignment this was opened from, if any (#131).
  const assignmentId = String(formData.get('a') ?? '') || null;
  const planTarget = { targetKind: 'task_type', targetId: task.key } as const;

  // Resume rather than stack up abandoned attempts on the same task type.
  const existing = await findInProgressExamTask(userId, exam.key, task.key);
  if (existing) {
    await linkAttemptToAssignment(
      userId,
      existing.id,
      assignmentId,
      planTarget,
    );
    redirect(`/practice/${exam.key}/${task.key}/${existing.id}`);
  }

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
    // The skill the attempt counts as: the part it is sat in, as a mock files
    // it, not the first skill it measures, which would put Repeat Sentence
    // under Listening. Its assessment still records every skill it measures.
    module: skillForTaskType(exam.key, task.key)!,
    taskIds: items.map((i) => i.id),
  });
  await linkAttemptToAssignment(userId, attempt.id, assignmentId, planTarget);

  redirect(`/practice/${exam.key}/${task.key}/${attempt.id}`);
}

/**
 * Whether a mock section's clock still allows writes to this attempt. Practice
 * has no shared clock, so it always does. The grace is what lets an autosave
 * already in flight when the clock hits zero still land.
 */
async function withinSectionClock(userId: string, attemptId: string) {
  const attempt = await getAttempt(userId, attemptId);
  if (!attempt?.mockAttemptId) return true;
  const clock = await mockSectionClock(userId, attempt);
  return acceptsWrite(new Date(), clock?.deadline ?? null);
}

export async function saveExamTaskAnswer(input: {
  attemptId: string;
  taskId: string;
  value: string;
}) {
  const userId = await requireUserId();
  if (!(await withinSectionClock(userId, input.attemptId))) return;
  await saveExamTaskResponse(userId, input.attemptId, input.taskId, {
    value: input.value,
  });
}

/** An item's stimulus began: its audio started playing, or it was first shown. */
export async function startExamTaskStimulus(input: {
  attemptId: string;
  taskId: string;
}) {
  const userId = await requireUserId();
  await markExamTaskStimulusStarted(userId, input.attemptId, input.taskId);
}

/** A mock candidate moves past an item. There is no way back to it. */
export async function completeExamTaskStep(input: {
  attemptId: string;
  taskId: string;
}) {
  const userId = await requireUserId();
  await completeExamTaskItem(userId, input.attemptId, input.taskId);
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
  if (!(await withinSectionClock(userId, attemptId))) {
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
    // A clock that ran out closes every section-timed task still open in the
    // section, not just the one whose page happened to fire the submit.
    await expireMockSectionIfDue(userId, attempt);
    // The next task type in the same part follows straight on: the part's
    // clock is already running, and an interstitial saying "the clock starts
    // when you continue" would be untrue.
    const exam = getExam(attempt.examKey);
    const order = (taskType: string | null) =>
      exam?.tasks.findIndex((t) => t.key === taskType) ?? -1;
    const next = (
      await getMockSectionAttempts(
        userId,
        attempt.mockAttemptId,
        attempt.module,
      )
    )
      .filter((r) => r.status === 'in_progress' && r.taskType)
      .sort((a, b) => order(a.taskType) - order(b.taskType))[0];
    if (next) redirect(`/practice/${next.examKey}/${next.taskType}/${next.id}`);
    await finishSittingSection(userId, attempt.mockAttemptId);
  }

  redirect(
    `/practice/${attempt.examKey}/${attempt.taskType}/${attempt.id}/review`,
  );
}
