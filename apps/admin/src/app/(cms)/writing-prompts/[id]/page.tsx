import { notFound } from 'next/navigation';
import { getWritingPromptById, isContentSat } from '@bandzen/db/queries';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';
import { EditorRail } from '@/components/editor-rail';
import { EditorShell } from '@/components/editor-shell';
import { resolveEditorEmail } from '@/lib/editor-email';
import {
  publishWritingPromptAction,
  unpublishWritingPromptAction,
  deleteWritingPromptAction,
  duplicateWritingPromptAction,
} from '../actions';
import { PromptEditor } from './prompt-editor';
import type { PromptFormValues } from './schema';

export default async function EditWritingPromptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrTeacher();
  const { id } = await params;
  const prompt = await getWritingPromptById(id);
  if (!prompt) notFound();

  const [editor, sat] = await Promise.all([
    resolveEditorEmail(prompt.updatedBy),
    isContentSat('writing_prompts', id),
  ]);

  const defaults: PromptFormValues = {
    task: prompt.task === 1 ? 1 : 2,
    format: prompt.format,
    promptText: prompt.promptText,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Writing prompts"
        title={prompt.slug}
        backHref="/writing-prompts"
        backLabel="Writing prompts"
        description={
          <span className="font-mono text-xs tabular-nums">
            Task {prompt.task} · edited by {editor} ·{' '}
            {prompt.updatedAt.toLocaleDateString()}
          </span>
        }
        action={<StatusBadge status={prompt.status} />}
      />

      <EditorShell
        rail={
          <EditorRail
            type="writing-prompt"
            id={prompt.id}
            noun="writing prompt"
            status={prompt.status}
            publishAction={publishWritingPromptAction}
            unpublishAction={unpublishWritingPromptAction}
            deleteAction={deleteWritingPromptAction}
            duplicateAction={sat ? duplicateWritingPromptAction : undefined}
          />
        }
      >
        <PromptEditor id={prompt.id} defaults={defaults} locked={sat} />
      </EditorShell>
    </div>
  );
}
