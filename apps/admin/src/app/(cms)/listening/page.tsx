import Link from 'next/link';
import { listTracksAdmin, ADMIN_PAGE_SIZE } from '@bandzen/db/queries';
import { Button } from '@bandzen/ui/components/button';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { ContentList } from '@/components/content-list';
import {
  bulkPublishTracksAction,
  bulkUnpublishTracksAction,
  bulkDeleteTracksAction,
} from './actions';

export const metadata = { title: 'Listening' };

export default async function ListeningPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requireAdminOrTeacher();
  const { q, status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const rows = await listTracksAdmin({
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
    href: `/listening/${r.id}`,
    title: r.title,
    meta: `${r.slug} · difficulty ${r.difficulty}`,
    status: r.status,
  }));

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Listening"
        description="Audio tracks with their transcripts, questions and answer keys. Students only ever see published ones."
        action={
          <div className="flex items-center gap-2">
            <Button
              nativeButton={false}
              render={<Link href="/listening/import" />}
              variant="outline"
            >
              Import JSON
            </Button>
            <Button nativeButton={false} render={<Link href="/listening/new" />}>
              New track
            </Button>
          </div>
        }
      />

      <ContentList
        items={items}
        page={page}
        hasMore={hasMore}
        emptyTitle="No tracks yet"
        emptyDescription="Upload an MP3 and write its transcript, or import a reviewed JSON file."
        emptyAction={
          <Button nativeButton={false} render={<Link href="/listening/new" />}>
            New track
          </Button>
        }
        bulk={{
          noun: 'track',
          publish: bulkPublishTracksAction,
          unpublish: bulkUnpublishTracksAction,
          remove: bulkDeleteTracksAction,
        }}
      />
    </div>
  );
}
