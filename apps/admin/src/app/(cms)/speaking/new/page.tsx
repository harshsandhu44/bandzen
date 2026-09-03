import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { createTestAction } from '../actions';

export const metadata = { title: 'New test' };

export default async function NewSpeakingTestPage() {
  await requireAdminOrTeacher();

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Speaking"
        title="New test"
        description="Created as a draft. Add the Part 1–3 prompts on the next screen, generate the examiner audio, then publish."
      />
      <form action={createTestAction} className="space-y-4">
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
        <Button type="submit">Create draft</Button>
      </form>
    </div>
  );
}
