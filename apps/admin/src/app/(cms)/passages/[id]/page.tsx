import { notFound } from 'next/navigation';
import {
  getPassageAdmin,
  checkPassageCompleteness,
} from '@bandzen/db/queries';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';
import { EditorRail } from '@/components/editor-rail';
import { EditorShell } from '@/components/editor-shell';
import { resolveEditorEmail } from '@/lib/editor-email';
import {
  publishPassageAction,
  unpublishPassageAction,
  deletePassageAction,
} from '../actions';
import { PassageEditor } from './passage-editor';
import type { PassageFormValues } from './schema';

export default async function EditPassagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrTeacher();
  const { id } = await params;
  const passage = await getPassageAdmin(id);
  if (!passage) notFound();

  const [issues, editor] = await Promise.all([
    checkPassageCompleteness(id),
    resolveEditorEmail(passage.updatedBy),
  ]);

  const defaults: PassageFormValues = {
    title: passage.title,
    topic: passage.topic ?? '',
    format: passage.format,
    difficulty: passage.difficulty,
    body: passage.body,
    headingsText: (passage.headings ?? []).join('\n'),
    questions: passage.questions.map((q) => ({
      id: q.id,
      idx: q.idx,
      kind: q.kind as PassageFormValues['questions'][number]['kind'],
      prompt: q.prompt,
      optionsText: (q.options ?? []).join('\n'),
      answerText: (q.answer ?? []).join(', '),
      evidence: q.evidence ?? '',
      explanation: q.explanation ?? '',
    })),
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Passages"
        title={passage.title}
        backHref="/passages"
        backLabel="Passages"
        description={
          <span className="font-mono text-xs tabular-nums">
            {passage.slug} · edited by {editor} ·{' '}
            {passage.updatedAt.toLocaleDateString()}
          </span>
        }
        action={<StatusBadge status={passage.status} />}
      />

      <EditorShell
        rail={
          <EditorRail
            type="passage"
            id={passage.id}
            noun="passage"
            status={passage.status}
            issues={issues}
            publishAction={publishPassageAction}
            unpublishAction={unpublishPassageAction}
            deleteAction={deletePassageAction}
          />
        }
      >
        <PassageEditor id={passage.id} defaults={defaults} />
      </EditorShell>
    </div>
  );
}
