import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { Textarea } from '@bandzen/ui/components/textarea';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { createPassageAction } from '../actions';

export const metadata = { title: 'New passage' };

export default async function NewPassagePage() {
  await requireAdminOrTeacher();

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Passages"
        title="New passage"
        description="Created as a draft. Add its questions and answer keys on the next screen, then publish."
      />
      <form action={createPassageAction} className="space-y-4">
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
        <div className="flex gap-4">
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <select
              id="format"
              name="format"
              defaultValue="academic"
              className="h-8 min-w-32 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            >
              <option value="academic">Academic</option>
              <option value="general">General</option>
            </select>
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
        </div>
        <div className="space-y-2">
          <Label htmlFor="body">Body</Label>
          <Textarea id="body" name="body" required className="min-h-64" />
        </div>
        <Button type="submit">Create draft</Button>
      </form>
    </div>
  );
}
