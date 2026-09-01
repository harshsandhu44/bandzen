import Link from 'next/link';
import { listResourcesAdmin } from '@bandzen/db/queries';
import { CATEGORY_TITLE } from '@bandzen/db/schema';
import { Button } from '@bandzen/ui/components/button';
import { EmptyState, PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';

export const metadata = { title: 'Resources' };

export default async function ResourcesPage() {
  await requireAdminOrTeacher();
  const resources = await listResourcesAdmin();

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Resources"
        description="Short guides students read between practice sessions. Only published ones are visible to them."
        action={
          <Button nativeButton={false} render={<Link href="/resources/new" />}>
            New resource
          </Button>
        }
      />

      {resources.length === 0 ? (
        <EmptyState
          title="No resources yet"
          description="Guides are grouped by category. Add the first one to start a category."
          action={
            <Button
              nativeButton={false}
              render={<Link href="/resources/new" />}
            >
              New resource
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {resources.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <Link
                  href={`/resources/${r.id}`}
                  className="text-sm hover:underline"
                >
                  {r.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {CATEGORY_TITLE[r.category]} · {r.level} · {r.minutes}m
                </p>
              </div>
              <StatusBadge status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
