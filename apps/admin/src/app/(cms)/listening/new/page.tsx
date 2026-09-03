import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { Textarea } from '@bandzen/ui/components/textarea';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { createTrackAction } from '../actions';

export const metadata = { title: 'New track' };

export default async function NewTrackPage() {
  await requireAdminOrTeacher();

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Listening"
        title="New track"
        description="Created as a draft. The MP3 is uploaded now; add its questions and answer keys on the next screen, then publish."
      />
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
            Transcript (the spoken script — this is the answer key, never sent
            to a student mid-attempt)
          </Label>
          <Textarea
            id="transcript"
            name="transcript"
            required
            className="min-h-64"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audio">Audio (MP3)</Label>
          <input
            id="audio"
            name="audio"
            type="file"
            accept="audio/mpeg,.mp3"
            required
            className="text-xs"
          />
        </div>
        <Button type="submit">Create draft</Button>
      </form>
    </div>
  );
}
