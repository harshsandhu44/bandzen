import Link from 'next/link';
import { listTracksAdmin } from '@bandzen/db/queries';
import { Button } from '@bandzen/ui/components/button';
import { EmptyState, PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';

export const metadata = { title: 'Listening' };

export default async function ListeningPage() {
  await requireAdminOrTeacher();
  const tracks = await listTracksAdmin();

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
            <Button
              nativeButton={false}
              render={<Link href="/listening/new" />}
            >
              New track
            </Button>
          </div>
        }
      />

      {tracks.length === 0 ? (
        <EmptyState
          title="No tracks yet"
          description="Upload an MP3 and write its transcript by hand, or import a reviewed JSON file from the generation pipeline."
          action={
            <Button
              nativeButton={false}
              render={<Link href="/listening/new" />}
            >
              New track
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {tracks.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <Link
                  href={`/listening/${t.id}`}
                  className="text-sm hover:underline"
                >
                  {t.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {t.slug} · difficulty {t.difficulty}
                </p>
              </div>
              <StatusBadge status={t.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
