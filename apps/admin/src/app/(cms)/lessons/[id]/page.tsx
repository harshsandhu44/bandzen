import { notFound } from 'next/navigation';
import {
  getLessonById,
  checkLessonCompleteness,
} from '@bandzen/db/queries';
import { LESSON_STAGES } from '@bandzen/db/schema';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';
import { EditorRail } from '@/components/editor-rail';
import { EditorShell } from '@/components/editor-shell';
import { resolveEditorEmail } from '@/lib/editor-email';
import {
  publishLessonAction,
  unpublishLessonAction,
  deleteLessonAction,
} from '../actions';
import { LessonEditor } from './lesson-editor';
import { blankBlock, type LessonFormValues, type BlockFormValues } from './schema';

export default async function EditLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrTeacher();
  const { id } = await params;
  const lesson = await getLessonById(id);
  if (!lesson) notFound();

  const [issues, editor] = await Promise.all([
    checkLessonCompleteness(id),
    resolveEditorEmail(lesson.updatedBy),
  ]);

  const stored = new Map((lesson.stages ?? []).map((s) => [s.id, s]));

  const defaults: LessonFormValues = {
    title: lesson.title,
    summary: lesson.summary,
    minutes: lesson.minutes,
    questionKind: lesson.questionKind ?? '',
    stages: LESSON_STAGES.map((stageId) => {
      const s = stored.get(stageId);
      return {
        id: stageId,
        present: !!s,
        blocks: (s?.blocks ?? []).map((b): BlockFormValues => {
          const base = blankBlock();
          switch (b.kind) {
            case 'prose':
              return { ...base, kind: 'prose', body: b.body };
            case 'steps':
              return { ...base, kind: 'steps', itemsText: b.items.join('\n') };
            case 'checklist':
              return {
                ...base,
                kind: 'checklist',
                itemsText: b.items.join('\n'),
              };
            case 'callout':
              return {
                ...base,
                kind: 'callout',
                calloutTone: b.tone,
                title: b.title,
                body: b.body,
              };
            case 'example':
              return {
                ...base,
                kind: 'example',
                source: b.source,
                question: b.question,
                answer: b.answer,
                why: b.why,
              };
            case 'try':
              return {
                ...base,
                kind: 'try',
                source: b.source ?? '',
                question: b.question,
                answer: b.answer,
                why: b.why,
              };
          }
        }),
      };
    }),
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Lessons"
        title={lesson.title}
        backHref="/lessons"
        backLabel="Lessons"
        description={
          <span className="font-mono text-xs tabular-nums">
            {lesson.slug} · {lesson.module} · edited by {editor} ·{' '}
            {lesson.updatedAt.toLocaleDateString()}
          </span>
        }
        action={<StatusBadge status={lesson.status} />}
      />

      <EditorShell
        rail={
          <EditorRail
            type="lesson"
            id={lesson.id}
            noun="lesson"
            status={lesson.status}
            issues={issues}
            publishAction={publishLessonAction}
            unpublishAction={unpublishLessonAction}
            deleteAction={deleteLessonAction}
          />
        }
      >
        <LessonEditor id={lesson.id} defaults={defaults} />
      </EditorShell>
    </div>
  );
}
