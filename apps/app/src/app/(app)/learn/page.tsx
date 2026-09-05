import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { Progress } from '@bandzen/ui/components/progress';
import { PageHeader, Panel } from '@/components/app/primitives';
import { UpgradePrompt } from '@/components/billing/pro';
import { requireUserId } from '@/lib/auth';
import { isPro } from '@/lib/db/queries';
import { learnOverview, nextLearnStep } from '@/lib/learn';
import { MODULE_LABEL } from '@/lib/modules';

export const metadata = { title: 'Learn' };

/**
 * The Learn hub. Answers "where am I across the four modules, and what do I
 * study next" -- which the old `redirect('/learn/reading')` could not.
 *
 * Cards carry lesson progress only, never a band. A band is how good you are
 * and lives on Progress; this page is about what to read.
 */
export default async function LearnPage() {
  const userId = await requireUserId();
  const [overview, next, pro] = await Promise.all([
    learnOverview(userId),
    nextLearnStep(userId),
    isPro(userId),
  ]);

  const anyWritten = overview.some((m) => m.total > 0);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Learn"
        title="Learn technique"
        description="Every module has a short course. Each lesson ends by sending you to practise what it just taught."
      />

      {next ? (
        <Panel
          headingId="start-next"
          title="Start next"
          action={
            <span className="font-metric text-metric-sm text-muted-foreground">
              {next.minutes} min
            </span>
          }
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="font-title text-title">{next.title}</p>
              <p className="text-sm text-muted-foreground">
                {MODULE_LABEL[next.module]} · {next.reason}
              </p>
            </div>
            <Button
              nativeButton={false}
              render={<Link href={`/learn/${next.module}/${next.slug}`} />}
            >
              Open lesson
              <ArrowRight />
            </Button>
          </div>
        </Panel>
      ) : anyWritten ? (
        <Panel headingId="start-next" title="Course complete">
          <p className="max-w-prose text-sm text-muted-foreground text-pretty">
            You have read every written lesson. New ones arrive as the practice
            material grows — until then, the engine is where the marks are.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            nativeButton={false}
            render={<Link href="/practice" />}
          >
            Go to practice
            <ArrowRight />
          </Button>
        </Panel>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {overview.map((m) => {
          const pct = m.total ? (m.done / m.total) * 100 : 0;
          return (
            <Link
              key={m.module}
              href={`/learn/${m.module}`}
              className="group block"
            >
              <Panel
                title={MODULE_LABEL[m.module]}
                className="h-full transition-shadow group-hover:ring-foreground/25"
                action={
                  <span
                    className={
                      m.total
                        ? 'font-metric text-metric-sm'
                        : 'font-metric text-metric-sm text-muted-foreground'
                    }
                  >
                    {m.done} / {m.total}
                  </span>
                }
              >
                {m.total > 0 ? (
                  <Progress
                    value={pct}
                    aria-label={`${MODULE_LABEL[m.module]} lessons finished`}
                  />
                ) : null}
                <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  {m.total === 0 ? (
                    'Lessons coming soon'
                  ) : m.next ? (
                    <>
                      Next: {m.next.title}
                      <ArrowRight className="size-3.5 shrink-0" aria-hidden />
                    </>
                  ) : (
                    'All lessons finished'
                  )}
                </p>
              </Panel>
            </Link>
          );
        })}
      </div>

      <Link
        href="/resources"
        className="flex items-center justify-between gap-4 border border-border p-4 transition-colors hover:border-foreground/30"
      >
        <span>
          <span className="block text-sm font-medium">Guides</span>
          <span className="block text-sm text-muted-foreground text-pretty">
            Short reads between practice sessions — strategy, vocabulary, exam
            day.
          </span>
        </span>
        <ArrowRight
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </Link>

      {!pro ? (
        <UpgradePrompt
          eyebrow="Bandzen Pro"
          title="Unlimited marking, Coach, and mock tests"
          source="learn_page"
        />
      ) : null}
    </div>
  );
}
