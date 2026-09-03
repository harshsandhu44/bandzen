import { notFound } from 'next/navigation';
import { getWritingPromptById } from '@bandzen/db/queries';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';
import { PublishControls } from '@/components/publish-controls';
import { EditorShell } from '@/components/editor-shell';
import { resolveEditorEmail } from '@/lib/editor-email';
import {
  publishWritingPromptAction,
  unpublishWritingPromptAction,
  deleteWritingPromptAction,
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

  const editor = await resolveEditorEmail(prompt.updatedBy);

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
          <PublishControls
            noun="writing prompt"
            id={prompt.id}
            status={prompt.status}
            publishAction={publishWritingPromptAction}
            unpublishAction={unpublishWritingPromptAction}
            deleteAction={deleteWritingPromptAction}
          />
        }
      >
        <PromptEditor id={prompt.id} defaults={defaults} />
      </EditorShell>
    </div>
  );
}
