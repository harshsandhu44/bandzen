import { notFound } from 'next/navigation';
import { getExam, getTask, timeLimitSeconds } from '@bandzen/exams/registry';
import { requireContentRole } from '@/lib/auth';
import { sampleAudioUrl } from '@/lib/db/queries';
import { sampleTask } from '@/lib/task-samples';
import { TaskLab } from './task-lab';

export const metadata = { title: 'Task lab', robots: { index: false } };

export default async function TaskLabPage({
  params,
}: PageProps<'/preview/tasks/[exam]/[task]'>) {
  await requireContentRole();
  const { exam: examKey, task: taskKey } = await params;
  const exam = getExam(examKey);
  const task = getTask(examKey, taskKey);
  if (!exam || !task) notFound();

  const { stimulus, item } = sampleTask(task, await sampleAudioUrl());
  const limit = timeLimitSeconds(exam, task);

  return (
    <TaskLab
      examName={exam.name}
      task={task}
      stimulus={stimulus}
      item={item}
      minutes={limit == null ? null : limit / 60}
      startedAt={new Date().toISOString()}
    />
  );
}
