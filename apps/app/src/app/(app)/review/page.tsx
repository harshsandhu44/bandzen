import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import {
  EmptyState,
  PageHeader,
  SectionHeader,
} from '@/components/app/primitives';
import { SkillStatus, toSkillLevel } from '@/components/app/status';
import { requireUserId } from '@/lib/auth';
import {
  accuracyByQuestionKind,
  listCompletedAttempts,
} from '@/lib/db/queries';
import { QUESTION_KIND_LABEL } from '@/lib/modules';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Review' };

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const MIN_ATTEMPTED = 5;

/**
 * Review is an index, not a second copy of the marking screens.
 *
 * Reading attempts already have a review page and writing attempts already
 * have a report; both are good, and duplicating either here would create two
 * places to fix the same bug.
 */
export default async function ReviewPage() {
  const userId = await requireUserId();

  const [attempts, accuracy] = await Promise.all([
    listCompletedAttempts(userId, 50),
    accuracyByQuestionKind(userId),
  ]);

  const ranked = accuracy
    .filter((k) => k.total >= MIN_ATTEMPTED)
    .sort((a, b) => a.accuracy - b.accuracy);

  return (
    <div className="max-w-3xl space-y-10">
      <PageHeader
        eyebrow="Review"
        title="What went wrong, and why"
        description="Every marked attempt, and the mistakes that keep recurring across them."
      />

      {ranked.length ? (
        <section aria-labelledby="patterns-heading" className="space-y-3">
          <SectionHeader as="h2">
            <span id="patterns-heading">Patterns across your attempts</span>
          </SectionHeader>
          <ul className="divide-y divide-border border-y border-border">
            {ranked.map((k) => {
              const label =
                QUESTION_KIND_LABEL[
                  k.kind as keyof typeof QUESTION_KIND_LABEL
                ] ?? k.kind;
              return (
                <li
                  key={k.kind}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm">{label}</p>
                    <p className="font-mono text-[0.625rem] tracking-[0.2em] text-muted-foreground uppercase tabular-nums">
                      {k.total - k.correct} wrong of {k.total} attempted
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-4">
                    <SkillStatus level={toSkillLevel(k.accuracy)} />
                    <Link
                      href={`/reading?kind=${k.kind}`}
                      className="font-mono text-[0.625rem] tracking-[0.2em] uppercase underline-offset-4 hover:underline"
                    >
                      Practise
                    </Link>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="attempts-heading" className="space-y-3">
        <SectionHeader as="h2">
          <span id="attempts-heading">Marked attempts</span>
        </SectionHeader>

        {attempts.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {attempts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="font-mono text-xs tracking-widest uppercase">
                    {a.module}
                    {a.kind !== 'practice' ? ` · ${a.kind}` : ''}
                  </p>
                  <p className="font-mono text-[0.625rem] tracking-[0.2em] text-muted-foreground uppercase tabular-nums">
                    {a.submittedAt ? DATE.format(a.submittedAt) : ''}
                  </p>
                </div>
                <span className="flex items-center gap-5">
                  <span className="font-metric text-metric-sm">
                    {a.band?.toFixed(1) ?? '—'}
                  </span>
                  <Link
                    href={`/review/${a.id}`}
                    className="inline-flex items-center gap-1 font-mono text-[0.625rem] tracking-[0.2em] uppercase underline-offset-4 hover:underline"
                  >
                    Review
                    <ArrowRight className="size-3" aria-hidden />
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Nothing to review yet"
            description="Your reviewed mistakes will appear here once you have finished a test."
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
        )}
      </section>
    </div>
  );
}
