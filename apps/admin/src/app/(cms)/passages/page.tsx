import Link from 'next/link';
import { listPassagesAdmin } from '@bandzen/db/queries';
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
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdminOrTeacher();
  const { q, status } = await searchParams;
  const rows = await listPassagesAdmin({
    q,
    status:
      status === 'draft' || status === 'published' ? status : undefined,
  });

  const items = rows.map((r) => ({
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
