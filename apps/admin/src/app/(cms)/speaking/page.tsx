import Link from 'next/link';
import { listSpeakingTestsAdmin, ADMIN_PAGE_SIZE } from '@bandzen/db/queries';
import { Button } from '@bandzen/ui/components/button';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { ContentList } from '@/components/content-list';
import {
  bulkPublishTestsAction,
  bulkUnpublishTestsAction,
  bulkDeleteTestsAction,
} from './actions';

export const metadata = { title: 'Speaking' };

export default async function SpeakingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdminOrTeacher();
  const { q, status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const rows = await listSpeakingTestsAdmin({
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
    href: `/speaking/${r.id}`,
    title: r.title,
    meta: `${r.slug} · difficulty ${r.difficulty}`,
    status: r.status,
  }));

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Speaking"
        description="Full Parts 1–3 interviews. Students only ever see published tests."
        action={
          <div className="flex items-center gap-2">
            <Button
              nativeButton={false}
              render={<Link href="/speaking/import" />}
              variant="outline"
            >
              Import JSON
            </Button>
            <Button nativeButton={false} render={<Link href="/speaking/new" />}>
              New test
            </Button>
          </div>
        }
      />

      <ContentList
        items={items}
        page={page}
        hasMore={hasMore}
        emptyTitle="No tests yet"
        emptyDescription="Create one by hand, or import a reviewed JSON file."
        emptyAction={
          <Button nativeButton={false} render={<Link href="/speaking/new" />}>
            New test
          </Button>
        }
        bulk={{
          noun: 'test',
          publish: bulkPublishTestsAction,
          unpublish: bulkUnpublishTestsAction,
          remove: bulkDeleteTestsAction,
        }}
      />
    </div>
  );
}
