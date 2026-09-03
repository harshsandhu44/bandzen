import { notFound } from 'next/navigation';
import { getWritingPromptById } from '@bandzen/db/queries';
import { Button } from '@bandzen/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@bandzen/ui/components/card';
import { Label } from '@bandzen/ui/components/label';
import { Textarea } from '@bandzen/ui/components/textarea';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';
import { PublishControls } from '@/components/publish-controls';
import {
  updateWritingPromptAction,
  publishWritingPromptAction,
  unpublishWritingPromptAction,
  deleteWritingPromptAction,
} from '../actions';

export default async function EditWritingPromptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrTeacher();
  const { id } = await params;
  const prompt = await getWritingPromptById(id);
  if (!prompt) notFound();

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Writing prompts"
        title={prompt.slug}
        description={
          <span className="font-mono text-xs tabular-nums">
            Task {prompt.task} · updated by {prompt.updatedBy ?? '—'} at{' '}
            {prompt.updatedAt.toLocaleString()}
          </span>
        }
        action={<StatusBadge status={prompt.status} />}
      />

      <PublishControls
        noun="writing prompt"
        id={prompt.id}
        status={prompt.status}
        publishAction={publishWritingPromptAction}
        unpublishAction={unpublishWritingPromptAction}
        deleteAction={deleteWritingPromptAction}
      />

      <Card>
        <CardHeader>
          <CardTitle>Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateWritingPromptAction} className="space-y-4">
            <input type="hidden" name="id" value={prompt.id} />
            <div className="flex gap-4">
              <div className="space-y-2">
                <Label htmlFor="task">Task</Label>
                <select
                  id="task"
                  name="task"
                  defaultValue={prompt.task}
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
                  defaultValue={prompt.format}
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
                defaultValue={prompt.promptText}
                required
                className="min-h-32"
              />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
