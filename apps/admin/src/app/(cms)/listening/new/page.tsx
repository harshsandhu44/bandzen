import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { Textarea } from '@bandzen/ui/components/textarea';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { GeneratePanel } from '@/components/generate-panel';
import { createTrackAction } from '../actions';

export const metadata = { title: 'New track' };

export default async function NewTrackPage() {
  await requireAdminOrTeacher();

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Listening"
        title="New track"
        description="Created as a draft. Give a transcript, an MP3, or both — whichever is missing is generated (audio from the transcript, or a transcript from the audio). Add questions on the next screen, then publish."
      />

      <GeneratePanel type="listening" noun="track" />

      <div className="border-t border-border pt-2 font-mono text-xs text-muted-foreground">
        or fill it in by hand
      </div>
      <form
        action={createTrackAction}
        encType="multipart/form-data"
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="topic">Topic</Label>
          <Input id="topic" name="topic" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty (1-5)</Label>
          <Input
            id="difficulty"
            name="difficulty"
            type="number"
            min={1}
            max={5}
            defaultValue={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transcript">
            Transcript (the spoken script — the answer key, never sent to a
            student mid-attempt). Leave blank to transcribe it from the audio.
          </Label>
          <Textarea id="transcript" name="transcript" className="min-h-64" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audio">
            Audio (MP3). Leave blank to synthesize it from the transcript.
          </Label>
          <input
            id="audio"
            name="audio"
            type="file"
            accept="audio/mpeg,.mp3"
            className="text-xs"
          />
        </div>
        <Button type="submit">Create draft</Button>
      </form>
    </div>
  );
}
