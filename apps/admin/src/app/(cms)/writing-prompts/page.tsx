import Link from 'next/link';
import { listWritingPromptsAdmin } from '@bandzen/db/queries';
import { Button } from '@bandzen/ui/components/button';
import { EmptyState, PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';

export const metadata = { title: 'Writing prompts' };

export default async function WritingPromptsPage() {
  await requireAdminOrTeacher();
  const prompts = await listWritingPromptsAdmin();

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Writing prompts"
        description="Task 1 and Task 2 prompts. Students only ever see published ones."
        action={
          <div className="flex items-center gap-2">
            <Button
              nativeButton={false}
              render={<Link href="/writing-prompts/import" />}
              variant="outline"
            >
              Import JSON
            </Button>
            <Button
              nativeButton={false}
              render={<Link href="/writing-prompts/new" />}
            >
              New prompt
            </Button>
          </div>
        }
      />

      {prompts.length === 0 ? (
        <EmptyState
          title="No writing prompts yet"
          description="Add a Task 1 or Task 2 prompt for students to practise against. Write one by hand, or import JSON."
          action={
            <Button
              nativeButton={false}
              render={<Link href="/writing-prompts/new" />}
            >
              New prompt
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {prompts.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <Link
                  href={`/writing-prompts/${p.id}`}
                  className="text-sm hover:underline"
                >
                  {p.slug}
                </Link>
                <p className="max-w-md truncate text-xs text-muted-foreground">
                  Task {p.task} · {p.format} · {p.promptText}
                </p>
              </div>
              <StatusBadge status={p.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
