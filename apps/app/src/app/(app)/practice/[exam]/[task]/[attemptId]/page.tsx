import { notFound, redirect } from 'next/navigation';
import { getExam, getTask } from '@bandzen/exams/registry';
import { requireContentRole, requireUserId } from '@/lib/auth';
import { getExamTaskAttempt } from '@/lib/db/queries';
import { runnerItems, sessionMinutes } from '@/lib/task-session';
import { TaskRunner } from '@/components/exam/task-runner';
import {
  saveExamTaskAnswer,
  saveExamTaskRecording,
  submitExamTaskSession,
} from '../actions';

export const metadata = { title: 'Practice task', robots: { index: false } };

export default async function TaskAttemptPage({
  params,
}: PageProps<'/practice/[exam]/[task]/[attemptId]'>) {
  await requireContentRole();
  const { exam: examKey, task: taskKey, attemptId } = await params;

  const exam = getExam(examKey);
  const task = getTask(examKey, taskKey);
  if (!exam || !task) notFound();

  const userId = await requireUserId();
  // Scoped by userId, so a stranger's attempt id is simply a 404.
  const data = await getExamTaskAttempt(userId, attemptId);
  if (!data || data.attempt.taskType !== task.key) notFound();

  if (data.attempt.status === 'complete') {
    redirect(`/practice/${exam.key}/${task.key}/${attemptId}/review`);
  }

  const items = runnerItems(task, data.items);

  return (
    <TaskRunner
      attemptId={data.attempt.id}
      task={task}
      items={items}
      startedAt={data.attempt.startedAt.toISOString()}
      minutes={sessionMinutes(exam, task, items.length)}
      autoSubmit={data.attempt.kind !== 'practice'}
      saveAction={saveExamTaskAnswer}
      uploadAction={saveExamTaskRecording}
      submitAction={submitExamTaskSession}
    />
  );
}
