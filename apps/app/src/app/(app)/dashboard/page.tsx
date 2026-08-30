import Link from 'next/link';
import { BandScale } from '@bandzen/ui/components/band-scale';
import { Button } from '@bandzen/ui/components/button';
import { requireUserId } from '@/lib/auth';
import {
  getProfile,
  latestBand,
  listCompletedAttempts,
} from '@/lib/db/queries';
import { buildPlan, nextAction } from '@/lib/study-plan';
import { StudyPlan } from '../study-plan';

export const metadata = { title: 'Dashboard' };

const mean = (a: number, b: number) => Math.round(((a + b) / 2) * 2) / 2;

export default async function DashboardPage() {
  const userId = await requireUserId();

  const [profile, attempts, readingBand, writingBand] = await Promise.all([
    getProfile(userId),
    listCompletedAttempts(userId),
    latestBand(userId, 'reading'),
    latestBand(userId, 'writing'),
  ]);

  const overall =
    readingBand != null && writingBand != null
      ? mean(readingBand, writingBand)
      : null;

  const planInput = {
    readingBand,
    writingBand,
    targetBand: profile?.targetBand ?? null,
    testDate: profile?.testDate ?? null,
  };

  const hasAny = readingBand != null || writingBand != null;

  return (
    <div className="max-w-2xl space-y-10">
      <header className="space-y-4">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Dashboard
        </p>

        {overall != null ? (
          <>
            <div className="flex items-baseline gap-4">
              <span className="font-metric text-metric-lg">
                {overall.toFixed(1)}
              </span>
              <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                Estimate, not an official score
              </span>
            </div>
            <BandScale
              value={overall}
              target={profile?.targetBand ?? undefined}
              variant="axis"
            />
          </>
        ) : (
          <h1 className="text-2xl font-medium tracking-tight">
            {hasAny ? 'One skill measured so far' : 'No estimate yet'}
          </h1>
        )}

        <p className="text-sm">{nextAction(planInput)}</p>

        {!hasAny ? (
          <Button size="lg" render={<Link href="/diagnostic" />}>
            Take the diagnostic
          </Button>
        ) : null}
      </header>

      {hasAny ? (
        <section className="space-y-3">
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            By skill
          </h2>
          {readingBand != null ? (
            <BandScale value={readingBand} label="Reading" />
          ) : null}
          {writingBand != null ? (
            <BandScale value={writingBand} label="Writing" />
          ) : null}
        </section>
      ) : null}

      {hasAny ? (
        <section className="space-y-3">
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Study plan
            {profile?.testDate ? ` · test on ${profile.testDate}` : ''}
          </h2>
          <StudyPlan tasks={buildPlan(planInput)} />
        </section>
      ) : null}

      {attempts.length ? (
        <section className="space-y-3">
          <h2 className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Recent attempts
          </h2>
          <ul className="divide-y divide-border border-y border-border">
            {attempts.slice(0, 8).map((a) => (
              <li
                key={a.id}
                className="flex items-baseline justify-between gap-4 py-3"
              >
                <Link
                  href={
                    a.module === 'reading'
                      ? `/reading/${a.id}/review`
                      : `/writing/${a.id}/report`
                  }
                  className="font-mono text-xs tracking-widest uppercase underline-offset-4 hover:underline"
                >
                  {a.module}
                  {a.kind === 'diagnostic' ? ' · diagnostic' : ''}
                </Link>
                <span className="font-metric text-metric-sm">
                  {a.band?.toFixed(1)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
