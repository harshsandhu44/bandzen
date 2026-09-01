import {
  resourceCategory,
  resourceLevel,
  attemptModule,
  questionKind,
} from '@bandzen/db/schema';
import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { createResourceAction } from '../actions';

export const metadata = { title: 'New resource' };

const selectClass =
  'h-8 min-w-32 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50';

export default async function NewResourcePage() {
  await requireAdminOrTeacher();

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Resources"
        title="New resource"
        description="Created as a draft. Write the body on the next screen, then publish."
      />
      <form action={createResourceAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="summary">Summary</Label>
          <Input id="summary" name="summary" required />
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              defaultValue={resourceCategory.enumValues[0]}
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
              defaultValue={resourceLevel.enumValues[0]}
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
              defaultValue={5}
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
              defaultValue=""
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
              defaultValue=""
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
        <Button type="submit">Create draft</Button>
      </form>
    </div>
  );
}
