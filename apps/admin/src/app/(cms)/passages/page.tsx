import Link from 'next/link';
import { listPassagesAdmin } from '@bandzen/db/queries';
import { Button } from '@bandzen/ui/components/button';
import { EmptyState, PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';

export const metadata = { title: 'Passages' };

export default async function PassagesPage() {
  await requireAdminOrTeacher();
  const passages = await listPassagesAdmin();

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

      {passages.length === 0 ? (
        <EmptyState
          title="No passages yet"
          description="Write one by hand, or import a reviewed JSON file from the generation pipeline."
          action={
            <Button nativeButton={false} render={<Link href="/passages/new" />}>
              New passage
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {passages.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <Link
                  href={`/passages/${p.id}`}
                  className="text-sm hover:underline"
                >
                  {p.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {p.slug} · {p.format} · difficulty {p.difficulty}
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
