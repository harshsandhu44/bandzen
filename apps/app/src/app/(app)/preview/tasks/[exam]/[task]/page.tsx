import { notFound } from 'next/navigation';
import { getExam, getTask, timeLimitSeconds } from '@bandzen/exams/registry';
import { requireContentRole } from '@/lib/auth';
import { getPublishedExamTask, sampleAudioUrl } from '@/lib/db/queries';
import { itemFromContent } from '@/lib/task-content';
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

  // A published item of this type when the CMS has one, through the same
  // content-only loader a real attempt would use; placeholder content if not.
  const published = await getPublishedExamTask(exam.key, task.key);
  const { stimulus, item } = published
    ? itemFromContent(task, published.content)
    : sampleTask(task, await sampleAudioUrl());
  const limit = timeLimitSeconds(exam, task);

  return (
    <TaskLab
      examName={exam.name}
      source={
        published ? `Published item · ${published.slug}` : 'Sample content'
      }
      task={task}
      stimulus={stimulus}
      item={item}
      minutes={limit == null ? null : limit / 60}
      startedAt={new Date().toISOString()}
    />
  );
}
