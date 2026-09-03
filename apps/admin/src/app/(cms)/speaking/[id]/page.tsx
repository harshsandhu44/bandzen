import { notFound } from 'next/navigation';
import { getSpeakingTestAdmin } from '@bandzen/db/queries';
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
  createPromptAction,
  deletePromptAction,
  deleteTestAction,
  publishTestAction,
  regenerateAudioAction,
  unpublishTestAction,
  updatePromptAction,
  updateTestAction,
} from '../actions';
import { GenerationStatus } from './generation-status';

const PART_TITLE: Record<number, string> = {
  1: 'Part 1 — Interview',
  2: 'Part 2 — Long turn',
  3: 'Part 3 — Discussion',
};

const selectClass =
  'h-8 min-w-32 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50';

export default async function EditSpeakingTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrTeacher();
  const { id } = await params;
  const test = await getSpeakingTestAdmin(id);
  if (!test) notFound();

  const pending = test.prompts.filter((p) => !p.audioUrl).length;

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Speaking"
        title={test.title}
        description={
          <span className="font-mono text-xs tabular-nums">
            {test.slug} · updated by {test.updatedBy ?? '—'} at{' '}
            {test.updatedAt.toLocaleString()}
          </span>
        }
        action={<StatusBadge status={test.status} />}
      />

      <PublishControls
        noun="speaking test"
        id={test.id}
        status={test.status}
        publishAction={publishTestAction}
        unpublishAction={unpublishTestAction}
        deleteAction={deleteTestAction}
      />

      <Card>
        <CardHeader>
          <CardTitle>Test</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateTestAction} className="space-y-4">
            <input type="hidden" name="id" value={test.id} />
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={test.title}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input id="topic" name="topic" defaultValue={test.topic ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty (1-5)</Label>
              <Input
                id="difficulty"
                name="difficulty"
                type="number"
                min={1}
                max={5}
                defaultValue={test.difficulty}
              />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Examiner audio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {pending > 0 ? (
            <GenerationStatus
              testId={test.id}
              pending={pending}
              error={test.generationError}
              timedOut={test.generationTimedOut}
            />
          ) : (
            <p className="text-muted-foreground">
              Every prompt has audio. Editing a prompt&apos;s text below and
              hitting &ldquo;Regenerate&rdquo; re-synthesizes just that one.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompts ({test.prompts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {test.prompts.map((p) => (
            <form
              key={p.id}
              action={updatePromptAction}
              className="space-y-2 border-b border-border pb-4"
            >
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="testId" value={test.id} />
              <div className="flex gap-4">
                <div className="space-y-1">
                  <Label htmlFor={`idx-${p.id}`}>Idx</Label>
                  <Input
                    id={`idx-${p.id}`}
                    name="idx"
                    type="number"
                    defaultValue={p.idx}
                    className="w-16"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`part-${p.id}`}>Part</Label>
                  <select
                    id={`part-${p.id}`}
                    name="part"
                    defaultValue={String(p.part)}
                    className={selectClass}
                  >
                    {[1, 2, 3].map((n) => (
                      <option key={n} value={n}>
                        {PART_TITLE[n]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`text-${p.id}`}>
                  Prompt (Part 2: the &ldquo;Describe …&rdquo; cue-card line)
                </Label>
                <Textarea
                  id={`text-${p.id}`}
                  name="text"
                  defaultValue={p.text}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`points-${p.id}`}>
                  Cue-card points (one per line — Part 2 only)
                </Label>
                <Textarea
                  id={`points-${p.id}`}
                  name="cueCardPoints"
                  defaultValue={(p.cueCardPoints ?? []).join('\n')}
                  className="min-h-20"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {p.audioUrl ? (
                  <audio controls src={p.audioUrl} className="h-8" />
                ) : (
                  <span className="text-xs text-destructive">
                    No audio yet — publish blocked
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  Save prompt
                </Button>
                {p.audioUrl ? (
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    formAction={regenerateAudioAction}
                    name="promptId"
                    value={p.id}
                  >
                    Regenerate audio
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  formAction={deletePromptAction}
                >
                  Delete
                </Button>
              </div>
            </form>
          ))}

          <form action={createPromptAction} className="space-y-2 pt-2">
            <input type="hidden" name="testId" value={test.id} />
            <p className="text-sm font-medium">Add a prompt</p>
            <div className="flex gap-4">
              <div className="space-y-1">
                <Label htmlFor="new-idx">Idx</Label>
                <Input
                  id="new-idx"
                  name="idx"
                  type="number"
                  defaultValue={test.prompts.length + 1}
                  className="w-16"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new-part">Part</Label>
                <select
                  id="new-part"
                  name="part"
                  defaultValue="1"
                  className={selectClass}
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {PART_TITLE[n]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-text">Prompt</Label>
              <Textarea id="new-text" name="text" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-points">
                Cue-card points (one per line — Part 2 only)
              </Label>
              <Textarea
                id="new-points"
                name="cueCardPoints"
                className="min-h-20"
              />
            </div>
            <Button type="submit" size="sm">
              Add prompt
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
