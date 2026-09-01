import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { Textarea } from '@bandzen/ui/components/textarea';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { createWritingPromptAction } from '../actions';

export const metadata = { title: 'New writing prompt' };

export default async function NewWritingPromptPage() {
  await requireAdminOrTeacher();

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Writing prompts"
        title="New writing prompt"
        description="Created as a draft, invisible to students until you publish it."
      />
      <form action={createWritingPromptAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" required />
        </div>
        <div className="flex gap-4">
          <div className="space-y-2">
            <Label htmlFor="task">Task</Label>
            <select
              id="task"
              name="task"
              defaultValue="2"
              className="h-8 min-w-24 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            >
              <option value="1">Task 1</option>
              <option value="2">Task 2</option>
            </select>
          </div>
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
        </div>
        <div className="space-y-2">
          <Label htmlFor="promptText">Prompt text</Label>
          <Textarea
            id="promptText"
            name="promptText"
            required
            className="min-h-32"
          />
        </div>
        <Button type="submit">Create draft</Button>
      </form>
    </div>
  );
}
