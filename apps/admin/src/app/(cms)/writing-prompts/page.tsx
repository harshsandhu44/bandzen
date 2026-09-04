import Link from 'next/link';
import { listWritingPromptsAdmin } from '@bandzen/db/queries';
import { Button } from '@bandzen/ui/components/button';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { ContentList } from '@/components/content-list';
import {
  bulkPublishPromptsAction,
  bulkUnpublishPromptsAction,
  bulkDeletePromptsAction,
} from './actions';

export const metadata = { title: 'Writing prompts' };

export default async function WritingPromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdminOrTeacher();
  const { q, status } = await searchParams;
  const rows = await listWritingPromptsAdmin({
    q,
    status:
      status === 'draft' || status === 'published' ? status : undefined,
  });

  const items = rows.map((r) => ({
    id: r.id,
    href: `/writing-prompts/${r.id}`,
    title: r.slug,
    meta: `Task ${r.task} · ${r.format} · ${r.promptText.slice(0, 80)}`,
    status: r.status,
  }));

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
            <Button nativeButton={false} render={<Link href="/writing-prompts/new" />}>
              New prompt
            </Button>
          </div>
        }
      />

      <ContentList
        items={items}
        emptyTitle="No writing prompts yet"
        emptyDescription="Write one by hand, or import a reviewed JSON file."
        emptyAction={
          <Button nativeButton={false} render={<Link href="/writing-prompts/new" />}>
            New prompt
          </Button>
        }
        bulk={{
          noun: 'prompt',
          publish: bulkPublishPromptsAction,
          unpublish: bulkUnpublishPromptsAction,
          remove: bulkDeletePromptsAction,
        }}
      />
    </div>
  );
}
