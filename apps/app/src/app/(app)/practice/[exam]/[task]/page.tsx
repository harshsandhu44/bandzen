import { notFound } from 'next/navigation';
import { getExam, getTask, timeLimitSeconds } from '@bandzen/exams/registry';
import { Eyebrow, PageHeader, Panel } from '@/components/app/primitives';
import { SubmitButton } from '@/components/app/submit-button';
import { requireUserId } from '@/lib/auth';
import { getPublishedExamTasks } from '@/lib/db/queries';
import { startExamTaskAttempt } from './actions';

export const metadata = { title: 'Practice task', robots: { index: false } };

export default async function TaskStartPage({
  params,
  searchParams,
}: PageProps<'/practice/[exam]/[task]'>) {
  // Signed in, but no longer staff-only: this PR is what opens PTE to students.
  await requireUserId();
  const { exam: examKey, task: taskKey } = await params;
  // The plan assignment the link came from, passed on to the Start action.
  const { a } = await searchParams;
  const assignmentId = typeof a === 'string' ? a : null;

  const exam = getExam(examKey);
  const task = getTask(examKey, taskKey);
  if (!exam || !task) notFound();

  const items = await getPublishedExamTasks(exam.key, task.key, 3);
  const limit = timeLimitSeconds(exam, task);

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        eyebrow={exam.name}
        title={task.label}
        description={`Measures ${task.measuredSkills.join(' and ')}.`}
      />
      <Panel headingId="start-task" title="Start">
        {items.length ? (
          <form action={startExamTaskAttempt} className="space-y-4">
            <input type="hidden" name="exam" value={exam.key} />
            <input type="hidden" name="task" value={task.key} />
            {assignmentId ? (
              <input type="hidden" name="a" value={assignmentId} />
            ) : null}
            <p className="text-sm text-muted-foreground">
              {items.length} item{items.length === 1 ? '' : 's'}
              {task.timing.scope === 'task' && limit != null
                ? ` · ${limit}s each`
                : null}
              {task.audio ? ' · audio plays once' : null}
            </p>
            <SubmitButton>Start</SubmitButton>
          </form>
        ) : (
          <div className="space-y-2">
            <Eyebrow>No content yet</Eyebrow>
            <p className="text-sm text-muted-foreground">
              Nothing of this type is published. Add an item in the CMS, or open
              the task lab to see the renderer against sample content.
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}
