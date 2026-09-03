import { notFound } from 'next/navigation';
import { getResourceById } from '@bandzen/db/queries';
import {
  resourceCategory,
  resourceLevel,
  attemptModule,
  questionKind,
} from '@bandzen/db/schema';
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
  updateResourceAction,
  publishResourceAction,
  unpublishResourceAction,
  deleteResourceAction,
} from '../actions';

const selectClass =
  'h-8 min-w-32 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50';

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrTeacher();
  const { id } = await params;
  const resource = await getResourceById(id);
  if (!resource) notFound();

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Resources"
        title={resource.title}
        description={
          <span className="font-mono text-xs tabular-nums">
            {resource.slug} · updated by {resource.updatedBy ?? '—'} at{' '}
            {resource.updatedAt.toLocaleString()}
          </span>
        }
        action={<StatusBadge status={resource.status} />}
      />

      <PublishControls
        noun="resource"
        id={resource.id}
        status={resource.status}
        publishAction={publishResourceAction}
        unpublishAction={unpublishResourceAction}
        deleteAction={deleteResourceAction}
      />

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateResourceAction} className="space-y-4">
            <input type="hidden" name="id" value={resource.id} />
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={resource.title}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Input
                id="summary"
                name="summary"
                defaultValue={resource.summary}
                required
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  defaultValue={resource.category}
                  className={selectClass}
                >
                  {resourceCategory.enumValues.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <select
                  id="level"
                  name="level"
                  defaultValue={resource.level}
                  className={selectClass}
                >
                  {resourceLevel.enumValues.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minutes">Minutes</Label>
                <Input
                  id="minutes"
                  name="minutes"
                  type="number"
                  min={1}
                  defaultValue={resource.minutes}
                  className="w-20"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label htmlFor="module">Module (optional)</Label>
                <select
                  id="module"
                  name="module"
                  defaultValue={resource.module ?? ''}
                  className={selectClass}
                >
                  <option value="">None</option>
                  {attemptModule.enumValues.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="questionKind">Question kind (optional)</Label>
                <select
                  id="questionKind"
                  name="questionKind"
                  defaultValue={resource.questionKind ?? ''}
                  className={selectClass}
                >
                  <option value="">None</option>
                  {questionKind.enumValues.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Body (blank line between paragraphs)</Label>
              <Textarea
                id="body"
                name="body"
                defaultValue={resource.body?.join('\n\n') ?? ''}
                className="min-h-48"
              />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
