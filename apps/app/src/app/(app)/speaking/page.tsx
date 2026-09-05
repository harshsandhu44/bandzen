import Link from 'next/link';
import { Badge } from '@bandzen/ui/components/badge';
import { Button } from '@bandzen/ui/components/button';
import { EmptyState, PageHeader, Panel } from '@/components/app/primitives';
import { FilterBar } from '@/components/app/filter-bar';
import { ProLocked } from '@/components/billing/pro';
import { capture } from '@/lib/analytics';
import { requireUserId } from '@/lib/auth';
import { DIFFICULTY_RANGE, isPro, listSpeakingTests } from '@/lib/db/queries';
import { startSpeakingAttempt } from './actions';

export const metadata = { title: 'Speaking practice' };

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

type Difficulty = keyof typeof DIFFICULTY_RANGE;

export default async function SpeakingPage({
  searchParams,
}: PageProps<'/speaking'>) {
  const userId = await requireUserId();
  const pro = await isPro(userId);

  if (!pro) {
    await capture(userId, 'pro_feature_locked', { surface: 'speaking' });
  }

  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) || undefined;

  const rawDifficulty = one(sp.difficulty);
  const difficulty =
    rawDifficulty && rawDifficulty in DIFFICULTY_RANGE
      ? (rawDifficulty as Difficulty)
      : undefined;

  const testId = one(sp.test);
  const tests = await listSpeakingTests({ difficulty, id: testId });

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Speaking"
        title="Practice tests"
        description="A full interview — Part 1, the Part 2 long turn, and Part 3. You hear the examiner, record each answer, and get a band estimate against the four speaking criteria."
      />

      {!pro ? (
        <ProLocked
          title="Speaking"
          description="A test is graded from your audio against all four criteria, pronunciation included. That marking is part of Pro."
          source="speaking_wall"
        />
      ) : null}

      {testId ? (
        <p className="border-l-2 border-chrome py-2 pl-4 text-sm">
          Showing the test from your study plan.{' '}
          <Link href="/speaking" className="underline underline-offset-4">
            Show all tests
          </Link>
        </p>
      ) : (
        <FilterBar
          legend="Difficulty"
          param="difficulty"
          options={DIFFICULTY_OPTIONS}
          active={difficulty ?? ''}
          basePath="/speaking"
          params={{ difficulty }}
        />
      )}

      {!tests.length ? (
        difficulty ? (
          <EmptyState
            title="No tests match that filter"
            description="Only a few tests are seeded so far. Widen the filter."
            action={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/speaking" />}
              >
                Clear filter
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No tests seeded yet"
            description="Run pnpm content:speaking:generate, review the JSON it writes, then pnpm content:speaking:audio, pnpm content:speaking:sql, and pnpm db:seed:speaking."
          />
        )
      ) : (
        <Panel
          title="Tests"
          action={
            <span className="font-metric text-metric-sm text-muted-foreground">
              {tests.length}
            </span>
          }
        >
          <ul className="-my-3 divide-y divide-border">
            {tests.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <h2 className="font-medium">{t.title}</h2>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">Level {t.difficulty}</Badge>
                    <span className="truncate">{t.topic}</span>
                  </p>
                </div>
                <form action={startSpeakingAttempt}>
                  <input type="hidden" name="testId" value={t.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Start
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
