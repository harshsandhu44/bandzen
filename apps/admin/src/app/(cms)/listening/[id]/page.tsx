import { notFound } from 'next/navigation';
import { getTrackAdmin } from '@bandzen/db/queries';
import { questionKind } from '@bandzen/db/schema';
import { Button } from '@bandzen/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@bandzen/ui/components/card';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { Textarea } from '@bandzen/ui/components/textarea';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';
import { PublishControls } from '@/components/publish-controls';
import {
  updateTrackAction,
  replaceAudioAction,
  publishTrackAction,
  unpublishTrackAction,
  deleteTrackAction,
  createQuestionAction,
  updateQuestionAction,
  deleteQuestionAction,
} from '../actions';

// Every kind in the enum. Real listening leans on multiple_choice,
// sentence_completion and matching, but the reading kinds are left available
// for anything a hand-built track needs.
const QUESTION_KINDS = questionKind.enumValues;

const selectClass =
  'h-8 min-w-48 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50';

export default async function EditTrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrTeacher();
  const { id } = await params;
  const track = await getTrackAdmin(id);
  if (!track) notFound();

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Listening"
        title={track.title}
        description={
          <span className="font-mono text-xs tabular-nums">
            {track.slug} · updated by {track.updatedBy ?? '—'} at{' '}
            {track.updatedAt.toLocaleString()}
          </span>
        }
        action={<StatusBadge status={track.status} />}
      />

      <PublishControls
        id={track.id}
        status={track.status}
        publishAction={publishTrackAction}
        unpublishAction={unpublishTrackAction}
        deleteAction={deleteTrackAction}
      />

      <Card>
        <CardHeader>
          <CardTitle>Track</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateTrackAction} className="space-y-4">
            <input type="hidden" name="id" value={track.id} />
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={track.title}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input id="topic" name="topic" defaultValue={track.topic ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty (1-5)</Label>
              <Input
                id="difficulty"
                name="difficulty"
                type="number"
                min={1}
                max={5}
                defaultValue={track.difficulty}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transcript">Transcript</Label>
              <Textarea
                id="transcript"
                name="transcript"
                defaultValue={track.transcript}
                required
                className="min-h-64"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matchingOptions">
                Matching options (one per line — the shared list every matching
                question draws its answer from)
              </Label>
              <Textarea
                id="matchingOptions"
                name="matchingOptions"
                defaultValue={(track.matchingOptions ?? []).join('\n')}
                className="min-h-24"
              />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            <a
              href={track.audioUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs hover:underline"
            >
              {track.audioUrl}
            </a>
          </p>
          <audio controls src={track.audioUrl} className="w-full" />
          <form
            action={replaceAudioAction}
            encType="multipart/form-data"
            className="flex flex-wrap items-end gap-2"
          >
            <input type="hidden" name="id" value={track.id} />
            <div className="space-y-1">
              <Label htmlFor="audio">Replace audio (MP3)</Label>
              <input
                id="audio"
                name="audio"
                type="file"
                accept="audio/mpeg,.mp3"
                required
                className="text-xs"
              />
            </div>
            <Button type="submit" size="sm" variant="outline">
              Upload
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Questions ({track.questions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {track.questions.map((q) => (
            <form
              key={q.id}
              action={updateQuestionAction}
              className="space-y-2 border-b border-border pb-4"
            >
              <input type="hidden" name="id" value={q.id} />
              <input type="hidden" name="trackId" value={track.id} />
              <div className="flex gap-4">
                <div className="space-y-1">
                  <Label htmlFor={`idx-${q.id}`}>Idx</Label>
                  <Input
                    id={`idx-${q.id}`}
                    name="idx"
                    type="number"
                    defaultValue={q.idx}
                    className="w-16"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`kind-${q.id}`}>Kind</Label>
                  <select
                    id={`kind-${q.id}`}
                    name="kind"
                    defaultValue={q.kind}
                    className={selectClass}
                  >
                    {QUESTION_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`prompt-${q.id}`}>Prompt</Label>
                <Textarea
                  id={`prompt-${q.id}`}
                  name="prompt"
                  defaultValue={q.prompt}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`options-${q.id}`}>
                  Options (one per line — multiple_choice only; leave blank for
                  matching, which uses the track&apos;s matching options)
                </Label>
                <Textarea
                  id={`options-${q.id}`}
                  name="options"
                  defaultValue={(q.options ?? []).join('\n')}
                  className="min-h-16"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`evidence-${q.id}`}>Evidence</Label>
                <Input
                  id={`evidence-${q.id}`}
                  name="evidence"
                  defaultValue={q.evidence ?? ''}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`explanation-${q.id}`}>Explanation</Label>
                <Input
                  id={`explanation-${q.id}`}
                  name="explanation"
                  defaultValue={q.explanation ?? ''}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`answer-${q.id}`}>
                  Answer (comma-separated)
                </Label>
                <Input
                  id={`answer-${q.id}`}
                  name="answer"
                  defaultValue={(q.answer ?? []).join(', ')}
                  className={
                    !q.answer || q.answer.length === 0
                      ? 'border-destructive'
                      : undefined
                  }
                />
                {!q.answer || q.answer.length === 0 ? (
                  <p className="text-xs text-destructive">
                    Missing an answer — publish will be blocked.
                  </p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  Save question
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  formAction={deleteQuestionAction}
                >
                  Delete question
                </Button>
              </div>
            </form>
          ))}

          <form action={createQuestionAction} className="space-y-2 pt-2">
            <input type="hidden" name="trackId" value={track.id} />
            <p className="text-sm font-medium">Add a question</p>
            <div className="flex gap-4">
              <div className="space-y-1">
                <Label htmlFor="new-idx">Idx</Label>
                <Input
                  id="new-idx"
                  name="idx"
                  type="number"
                  defaultValue={track.questions.length + 1}
                  className="w-16"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-kind">Kind</Label>
                <select
                  id="new-kind"
                  name="kind"
                  defaultValue="multiple_choice"
                  className={selectClass}
                >
                  {QUESTION_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-prompt">Prompt</Label>
              <Textarea id="new-prompt" name="prompt" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-options">
                Options (one per line — multiple_choice only)
              </Label>
              <Textarea id="new-options" name="options" className="min-h-16" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-evidence">Evidence</Label>
              <Input id="new-evidence" name="evidence" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-explanation">Explanation</Label>
              <Input id="new-explanation" name="explanation" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-answer">Answer (comma-separated)</Label>
              <Input id="new-answer" name="answer" required />
            </div>
            <Button type="submit" size="sm">
              Add question
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
