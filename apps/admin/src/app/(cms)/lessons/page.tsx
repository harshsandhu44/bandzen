import Link from 'next/link';
import { listLessonsAdmin, ADMIN_PAGE_SIZE } from '@bandzen/db/queries';
import { Button } from '@bandzen/ui/components/button';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { ContentList } from '@/components/content-list';
import {
  bulkPublishLessonsAction,
  bulkUnpublishLessonsAction,
  bulkDeleteLessonsAction,
} from './actions';

export const metadata = { title: 'Lessons' };

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdminOrTeacher();
  const { q, status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const rows = await listLessonsAdmin({
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
    href: `/lessons/${r.id}`,
    title: r.title,
    meta: `${r.slug} · ${r.module} / ${r.group} · ${r.minutes}m`,
    status: r.status,
  }));

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Lessons"
        description="Grouped by module then section. Search or filter to narrow the list."
        action={
          <div className="flex items-center gap-2">
            <Button
              nativeButton={false}
              render={<Link href="/lessons/import" />}
              variant="outline"
            >
              Import JSON
            </Button>
            <Button nativeButton={false} render={<Link href="/lessons/new" />}>
              New lesson
            </Button>
          </div>
        }
      />

      <ContentList
        items={items}
        page={page}
        hasMore={hasMore}
        emptyTitle="No lessons yet"
        emptyDescription="Write one by hand, or import a reviewed JSON file."
        emptyAction={
          <Button nativeButton={false} render={<Link href="/lessons/new" />}>
            New lesson
          </Button>
        }
        bulk={{
          noun: 'lesson',
          publish: bulkPublishLessonsAction,
          unpublish: bulkUnpublishLessonsAction,
          remove: bulkDeleteLessonsAction,
        }}
      />
    </div>
  );
}
