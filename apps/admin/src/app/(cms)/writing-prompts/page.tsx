import Link from 'next/link';
import { listWritingPromptsAdmin, ADMIN_PAGE_SIZE } from '@bandzen/db/queries';
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
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdminOrTeacher();
  const { q, status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const rows = await listWritingPromptsAdmin({
    q,
    status:
      status === 'draft' || status === 'published' ? status : undefined,
    limit: ADMIN_PAGE_SIZE + 1,
    offset: (page - 1) * ADMIN_PAGE_SIZE,
  });
  const hasMore = rows.length > ADMIN_PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, ADMIN_PAGE_SIZE) : rows;

  const items = pageRows.map((r) => ({
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
        page={page}
        hasMore={hasMore}
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
