import Link from 'next/link';
import { listSpeakingTestsAdmin } from '@bandzen/db/queries';
import { Button } from '@bandzen/ui/components/button';
import { EmptyState, PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';

export const metadata = { title: 'Speaking' };

export default async function SpeakingPage() {
  await requireAdminOrTeacher();
  const tests = await listSpeakingTestsAdmin();

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Speaking"
        description="Full Parts 1–3 interviews. Each prompt gets a synthesized examiner voice; students record their answers and are graded from the audio. Students only ever see published tests."
        action={
          <Button nativeButton={false} render={<Link href="/speaking/new" />}>
            New test
          </Button>
        }
      />

      {tests.length === 0 ? (
        <EmptyState
          title="No tests yet"
          description="Create one by hand, or seed a batch with the pnpm content:speaking pipeline."
          action={
            <Button nativeButton={false} render={<Link href="/speaking/new" />}>
              New test
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {tests.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <Link
                  href={`/speaking/${t.id}`}
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
