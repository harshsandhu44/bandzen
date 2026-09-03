import { notFound } from 'next/navigation';
import {
  getTrackAdmin,
  checkTrackCompleteness,
} from '@bandzen/db/queries';
import { Button } from '@bandzen/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@bandzen/ui/components/card';
import { Field } from '@bandzen/ui/components/field';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';
import { PublishControls } from '@/components/publish-controls';
import { EditorShell, CompletenessPanel } from '@/components/editor-shell';
import { resolveEditorEmail } from '@/lib/editor-email';
import {
  replaceAudioAction,
  regenerateAudioAction,
  publishTrackAction,
  unpublishTrackAction,
  deleteTrackAction,
} from '../actions';
import { GenerationStatus } from './generation-status';
import { TrackEditor } from './track-editor';
import type { TrackFormValues } from './schema';

export default async function EditTrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrTeacher();
  const { id } = await params;
  const track = await getTrackAdmin(id);
  if (!track) notFound();

  const [issues, editor] = await Promise.all([
    checkTrackCompleteness(id),
    resolveEditorEmail(track.updatedBy),
  ]);

  const defaults: TrackFormValues = {
    title: track.title,
    topic: track.topic ?? '',
    difficulty: track.difficulty,
    transcriptText: track.transcript ?? '',
    matchingOptionsText: (track.matchingOptions ?? []).join('\n'),
    questions: track.questions.map((q) => ({
      id: q.id,
      idx: q.idx,
      kind: q.kind,
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
        eyebrow="Listening"
        title={track.title}
        backHref="/listening"
        backLabel="Listening"
        description={
          <span className="font-mono text-xs tabular-nums">
            {track.slug} · edited by {editor} ·{' '}
            {track.updatedAt.toLocaleDateString()}
          </span>
        }
        action={<StatusBadge status={track.status} />}
      />

      <EditorShell
        rail={
          <>
            <PublishControls
              noun="track"
              id={track.id}
              status={track.status}
              publishAction={publishTrackAction}
              unpublishAction={unpublishTrackAction}
              deleteAction={deleteTrackAction}
            />
            <CompletenessPanel issues={issues} />
          </>
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>Audio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {track.audioUrl ? (
              <audio controls src={track.audioUrl} className="w-full" />
            ) : track.transcript ? (
              <GenerationStatus
                trackId={track.id}
                missing="audio"
                error={track.generationError}
                timedOut={track.generationTimedOut}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Add a transcript or upload an MP3 — the other is generated from it.
              </p>
            )}

            <form
              action={replaceAudioAction}
              encType="multipart/form-data"
              className="flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="id" value={track.id} />
              <Field
                label={track.audioUrl ? 'Replace audio (MP3)' : 'Upload audio (MP3)'}
              >
                <input
                  name="audio"
                  type="file"
                  accept="audio/mpeg,.mp3"
                  required
                  className="text-xs"
                />
              </Field>
              <Button type="submit" size="sm" variant="outline">
                Upload
              </Button>
            </form>

            {track.audioUrl && track.transcript ? (
              <form action={regenerateAudioAction}>
                <input type="hidden" name="id" value={track.id} />
                <Button type="submit" size="sm" variant="ghost">
                  Regenerate audio from transcript
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>

        {track.audioUrl && !track.transcript ? (
          <Card>
            <CardHeader>
              <CardTitle>Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <GenerationStatus
                trackId={track.id}
                missing="transcript"
                error={track.generationError}
                timedOut={track.generationTimedOut}
              />
            </CardContent>
          </Card>
        ) : null}

        <TrackEditor id={track.id} defaults={defaults} />
      </EditorShell>
    </div>
  );
}
