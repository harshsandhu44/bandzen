import { notFound } from 'next/navigation';
import {
  getSpeakingTestAdmin,
  checkSpeakingTestCompleteness,
} from '@bandzen/db/queries';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@bandzen/ui/components/card';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';
import { PublishControls } from '@/components/publish-controls';
import { EditorShell, CompletenessPanel } from '@/components/editor-shell';
import { resolveEditorEmail } from '@/lib/editor-email';
import {
  publishTestAction,
  unpublishTestAction,
  deleteTestAction,
} from '../actions';
import { GenerationStatus } from './generation-status';
import { SpeakingEditor } from './speaking-editor';
import type { SpeakingFormValues } from './schema';

export default async function EditSpeakingTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrTeacher();
  const { id } = await params;
  const test = await getSpeakingTestAdmin(id);
  if (!test) notFound();

  const [issues, editor] = await Promise.all([
    checkSpeakingTestCompleteness(id),
    resolveEditorEmail(test.updatedBy),
  ]);

  const pending = test.prompts.filter((p) => !p.audioUrl).length;

  const defaults: SpeakingFormValues = {
    title: test.title,
    topic: test.topic ?? '',
    difficulty: test.difficulty,
    prompts: test.prompts.map((p) => ({
      id: p.id,
      idx: p.idx,
      part: (p.part === 2 ? 2 : p.part === 3 ? 3 : 1) as 1 | 2 | 3,
      text: p.text,
      cueCardPointsText: (p.cueCardPoints ?? []).join('\n'),
    })),
  };

  const audioByPromptId: Record<string, string> = {};
  for (const p of test.prompts) {
    if (p.audioUrl) audioByPromptId[p.id] = p.audioUrl;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Speaking"
        title={test.title}
        backHref="/speaking"
        backLabel="Speaking"
        description={
          <span className="font-mono text-xs tabular-nums">
            {test.slug} · edited by {editor} ·{' '}
            {test.updatedAt.toLocaleDateString()}
          </span>
        }
        action={<StatusBadge status={test.status} />}
      />

      <EditorShell
        rail={
          <>
            <PublishControls
              noun="speaking test"
              id={test.id}
              status={test.status}
              publishAction={publishTestAction}
              unpublishAction={unpublishTestAction}
              deleteAction={deleteTestAction}
            />
            <CompletenessPanel issues={issues} />
          </>
        }
      >
        {pending > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Examiner audio</CardTitle>
            </CardHeader>
            <CardContent>
              <GenerationStatus
                testId={test.id}
                pending={pending}
                error={test.generationError}
                timedOut={test.generationTimedOut}
              />
            </CardContent>
          </Card>
        ) : null}

        <SpeakingEditor
          id={test.id}
          defaults={defaults}
          audioByPromptId={audioByPromptId}
        />
      </EditorShell>
    </div>
  );
}
