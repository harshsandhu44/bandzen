import { notFound } from 'next/navigation';
import {
  checkExamTaskCompleteness,
  getExamTaskAdmin,
} from '@bandzen/db/queries';
import { examLabel, getTask } from '@bandzen/exams/registry';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';
import { EditorRail } from '@/components/editor-rail';
import { EditorShell } from '@/components/editor-shell';
import { resolveEditorEmail } from '@/lib/editor-email';
import {
  deleteExamTaskAction,
  publishExamTaskAction,
  unpublishExamTaskAction,
} from '../actions';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.bandzen.com';

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-border py-3 sm:grid-cols-[10rem_1fr]">
      <dt className="font-mono text-[0.6875rem] tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="min-w-0 text-sm break-words">{children}</dd>
    </div>
  );
}

const list = (items: string[] | null) =>
  items?.length ? (
    <ol className="list-decimal space-y-1 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  ) : (
    '—'
  );

/**
 * An exam task, read back as its exam definition sees it. Editing is by
 * re-import for now; what this page adds is the task-aware publish check and
 * a preview in the real exam shell.
 */
export default async function ExamTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrTeacher();
  const { id } = await params;
  const task = await getExamTaskAdmin(id);
  if (!task) notFound();

  const [issues, editor] = await Promise.all([
    checkExamTaskCompleteness(id),
    resolveEditorEmail(task.updatedBy),
  ]);
  const definition = getTask(task.examKey, task.taskType);
  const c = task.content;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Exam tasks"
        title={task.title}
        backHref="/tasks"
        backLabel="Exam tasks"
        description={
          <span className="font-mono text-xs tabular-nums">
            {task.slug} · edited by {editor} ·{' '}
            {task.updatedAt.toLocaleDateString()}
          </span>
        }
        action={<StatusBadge status={task.status} />}
      />

      <EditorShell
        rail={
          <EditorRail
            type="exam-task"
            id={task.id}
            noun="exam task"
            status={task.status}
            issues={issues}
            publishAction={publishExamTaskAction}
            unpublishAction={unpublishExamTaskAction}
            deleteAction={deleteExamTaskAction}
          />
        }
      >
        <dl className="border-t border-border">
          <Field label="Exam">
            {examLabel(task.examKey)} · format {task.examVersion}
          </Field>
          <Field label="Task">
            {definition
              ? `${definition.label} · ${definition.section} · ${definition.stimulus} stimulus · ${definition.renderer} · marked by ${definition.evaluator}`
              : `${task.taskType} (not declared by this exam)`}
          </Field>
          <Field label="Prompt">{c.prompt}</Field>
          <Field label="Text">{c.stimulus.text ?? '—'}</Field>
          <Field label="Audio">{c.stimulus.audioUrl ?? '—'}</Field>
          <Field label="Image">
            {c.stimulus.imageUrl ?? '—'}
            {c.stimulus.imageAlt ? ` · alt: ${c.stimulus.imageAlt}` : ''}
          </Field>
          <Field label="Options">{list(c.options)}</Field>
          <Field label="Gapped text">{c.gapped ?? '—'}</Field>
          <Field label="Pieces">{list(c.tokens)}</Field>
          <Field label="Turns">{list(c.turns)}</Field>
          <Field label="Timing">
            {c.timing
              ? `${c.timing.prepSeconds}s prepare · ${c.timing.responseSeconds}s respond`
              : 'The exam’s own'}
          </Field>
          <Field label="Difficulty">{c.difficulty}</Field>
          <Field label="Answer key">{list(task.answer)}</Field>
          <Field label="Transcript">{task.transcript ?? '—'}</Field>
        </dl>
        {definition && task.status === 'published' ? (
          <a
            href={`${APP_URL}/preview/tasks/${task.examKey}/${task.taskType}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-block text-sm underline underline-offset-4"
          >
            Preview in the exam shell
          </a>
        ) : null}
      </EditorShell>
    </div>
  );
}
