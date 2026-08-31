import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import {
  EmptyState,
  PageHeader,
  SectionHeader,
} from '@/components/app/primitives';
import { FilterBar } from '@/components/app/filter-bar';
import { requireUserId } from '@/lib/auth';
import { latestDiagnostic, listCompletedAttempts } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Mock tests' };

const TABS = [
  { value: '', label: 'Full tests' },
  { value: 'section', label: 'Section tests' },
  { value: 'completed', label: 'Completed' },
];

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** A test we can actually run today. */
function TestCard({
  title,
  modules,
  duration,
  difficulty,
  status,
  description,
  href,
  cta,
}: {
  title: string;
  modules: readonly string[];
  duration: string;
  difficulty: string;
  status: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <article className="border border-border">
      <div className="border-b border-border px-5 py-4">
        <h3 className="font-medium">{title}</h3>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground text-pretty">
          {description}
        </p>
      </div>

      <dl className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border sm:grid-cols-4 sm:divide-y-0">
        {[
          ['Sections', modules.join(' · ')],
          ['Duration', duration],
          ['Difficulty', difficulty],
          ['Status', status],
        ].map(([label, value]) => (
          <div key={label} className="px-5 py-3">
            <dt className="font-mono text-[0.625rem] tracking-[0.2em] text-muted-foreground uppercase">
              {label}
            </dt>
            <dd className="mt-0.5 text-sm tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="px-5 py-4">
        <Button nativeButton={false} render={<Link href={href} />}>
          {cta}
          <ArrowRight />
        </Button>
      </div>
    </article>
  );
}

export default async function TestsPage({ searchParams }: PageProps<'/tests'>) {
  const userId = await requireUserId();

  const sp = await searchParams;
  const raw = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab = raw === 'section' || raw === 'completed' ? raw : '';

  const [completed, diagnostic] = await Promise.all([
    listCompletedAttempts(userId, 50),
    latestDiagnostic(userId),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Mock tests"
        title="Sit a test under exam conditions"
        description="Timed, scored the way the exam is scored, and marked afterwards so you can see what went wrong."
      />

      <FilterBar
        legend="Show"
        param="tab"
        options={TABS}
        active={tab}
        basePath="/tests"
        params={{}}
      />

      {tab === '' ? (
        <div className="space-y-5">
          <TestCard
            title="Diagnostic"
            description="One reading passage and one Task 2 essay, back to back. The fastest way to get a first estimate in both skills and a plan built around it."
            modules={['Reading', 'Writing']}
            duration="1h 20m"
            difficulty="Easier than exam"
            status={diagnostic ? 'Attempted' : 'Not attempted'}
            href="/diagnostic"
            cta={diagnostic ? 'Take another diagnostic' : 'Start diagnostic'}
          />

          {/* The honest state of a four-skill mock: it does not exist, and
              saying so is better than a card that cannot be started. */}
          <div className="flex items-start gap-3 border border-dashed border-border px-5 py-6">
            <Lock
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium">Full four-skill mock</p>
              <p className="mt-1 max-w-prose text-sm text-muted-foreground text-pretty">
                A complete mock needs Listening and Speaking, and neither has
                material yet. Until they do, the Reading and Writing sections
                above are the whole of what we can mark honestly.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'section' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <TestCard
            title="Reading section"
            description="One passage, thirteen questions, timed at exam pace. Filter by question type if you are drilling something specific."
            modules={['Reading']}
            duration="20 min"
            difficulty="Choose"
            status="Available"
            href="/reading"
            cta="Choose a passage"
          />
          <TestCard
            title="Writing section"
            description="One task under full timing, graded against the four criteria with annotated feedback on your own sentences."
            modules={['Writing']}
            duration="40 min"
            difficulty="Choose"
            status="Available"
            href="/writing"
            cta="Choose a task"
          />
        </div>
      ) : null}

      {tab === 'completed' ? (
        completed.length ? (
          <section className="space-y-3">
            <SectionHeader as="h2">{completed.length} completed</SectionHeader>
            <ul className="divide-y divide-border border-y border-border">
              {completed.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <Link
                      href={
                        a.module === 'reading'
                          ? `/reading/${a.id}/review`
                          : `/writing/${a.id}/report`
                      }
                      className="font-mono text-xs tracking-widest uppercase underline-offset-4 hover:underline"
                    >
                      {a.module}
                      {a.kind !== 'practice' ? ` · ${a.kind}` : ''}
                    </Link>
                    <p className="font-mono text-[0.625rem] tracking-[0.2em] text-muted-foreground uppercase tabular-nums">
                      {a.submittedAt ? DATE.format(a.submittedAt) : ''}
                    </p>
                  </div>
                  <span className="font-metric text-metric-sm">
                    {a.band?.toFixed(1) ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <EmptyState
            title="No tests attempted yet"
            description="Take your first test to start building a performance profile. Until then there is nothing to measure progress against."
            action={
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href="/diagnostic" />}
              >
                Start the diagnostic
              </Button>
            }
          />
        )
      ) : null}

      <p className="max-w-prose text-xs text-muted-foreground">
        Bandzen tests are practice material and Bandzen scores are estimates.
        Neither is an official IELTS examination or an official IELTS band.
      </p>
    </div>
  );
}
