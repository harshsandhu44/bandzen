import {
  attemptModule,
  lessonGroup,
  questionKind,
  GROUP_TITLE,
} from '@bandzen/db/schema';
import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { createLessonAction } from '../actions';

export const metadata = { title: 'New lesson' };

const selectClass =
  'h-8 min-w-32 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50';

export default async function NewLessonPage() {
  await requireAdminOrTeacher();

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Lessons"
        title="New lesson"
        description="Created as an unwritten draft. Add its stages and blocks on the lesson's own page afterwards."
      />
      <form action={createLessonAction} className="space-y-4">
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
            <Label htmlFor="module">Module</Label>
            <select
              id="module"
              name="module"
              defaultValue={attemptModule.enumValues[0]}
              className={selectClass}
            >
              {attemptModule.enumValues.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="group">Group</Label>
            <select
              id="group"
              name="group"
              defaultValue={lessonGroup.enumValues[0]}
              className={selectClass}
            >
              {lessonGroup.enumValues.map((g) => (
                <option key={g} value={g}>
                  {GROUP_TITLE[g]}
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
        <Button type="submit">Create draft</Button>
      </form>
    </div>
  );
}
