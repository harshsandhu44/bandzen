import Link from 'next/link';
import { listPassagesAdmin, ADMIN_PAGE_SIZE } from '@bandzen/db/queries';
import { Button } from '@bandzen/ui/components/button';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { ContentList } from '@/components/content-list';
import {
  bulkPublishPassagesAction,
  bulkUnpublishPassagesAction,
  bulkDeletePassagesAction,
} from './actions';

export const metadata = { title: 'Passages' };

export default async function PassagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdminOrTeacher();
  const { q, status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const rows = await listPassagesAdmin({
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
    href: `/passages/${r.id}`,
    title: r.title,
    meta: `${r.slug} · ${r.format} · difficulty ${r.difficulty}`,
    status: r.status,
  }));

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Passages"
        description="Reading passages with their questions and answer keys. Students only ever see published ones."
        action={
          <div className="flex items-center gap-2">
            <Button
              nativeButton={false}
              render={<Link href="/passages/import" />}
              variant="outline"
            >
              Import JSON
            </Button>
            <Button nativeButton={false} render={<Link href="/passages/new" />}>
              New passage
            </Button>
          </div>
        }
      />

      <ContentList
        items={items}
        page={page}
        hasMore={hasMore}
        emptyTitle="No passages yet"
        emptyDescription="Write one by hand, or import a reviewed JSON file."
        emptyAction={
          <Button nativeButton={false} render={<Link href="/passages/new" />}>
            New passage
          </Button>
        }
        bulk={{
          noun: 'passage',
          publish: bulkPublishPassagesAction,
          unpublish: bulkUnpublishPassagesAction,
          remove: bulkDeletePassagesAction,
        }}
      />
    </div>
  );
}
