import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BandScale } from '@bandzen/ui/components/band-scale';
import { BandReveal } from '@/components/exam/band-reveal';
import { requireUserId } from '@/lib/auth';
import { getDiagnostic, getProfile } from '@/lib/db/queries';
import { todayIso } from '@/lib/dates';
import { buildPlan, nextAction } from '@/lib/study-plan';
import { GradingWatch } from '@/components/app/grading-watch';
import { ComingUp } from '@/components/dashboard/coming-up';

export const metadata = { title: 'Diagnostic result' };

const mean = (a: number, b: number) => Math.round(((a + b) / 2) * 2) / 2;

export default async function DiagnosticResultPage({
  params,
}: PageProps<'/diagnostic/[attemptId]/result'>) {
  const { attemptId } = await params;
  const userId = await requireUserId();

  const data = await getDiagnostic(userId, attemptId);
  if (!data) notFound();

  const profile = await getProfile(userId);
  const { reading, writing, weaknesses } = data;

  const stillGrading =
    writing?.status === 'grading' || writing?.status === 'in_progress';
  const readingBand = reading.band;
  const writingBand = writing?.band ?? null;
  const overall =
    readingBand != null && writingBand != null
      ? mean(readingBand, writingBand)
      : null;

  const planInput = {
    readingBand,
    writingBand,
    targetBand: profile?.targetBand ?? null,
    testDate: profile?.testDate ?? null,
    weaknesses,
  };

  return (
    <div className="max-w-2xl space-y-10">
      {stillGrading && writing ? <GradingWatch attemptId={writing.id} /> : null}

      <header className="space-y-4">
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          Diagnostic result
        </p>
        {overall != null ? (
          <>
            <BandReveal
              value={overall}
              target={profile?.targetBand ?? undefined}
            />
            <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
              Estimate, not an official score
            </p>
          </>
        ) : (
          <h1 className="font-title text-title-lg">
            {stillGrading ? 'Marking your essay' : 'Diagnostic in progress'}
          </h1>
        )}
      </header>

      <section className="space-y-4">
        <h2 className="font-title text-title">By skill</h2>

        {readingBand != null ? (
          <div className="space-y-1">
            <BandScale value={readingBand} label="Reading" />
            <p className="text-xs text-muted-foreground tabular-nums">
              {reading.rawScore}/{reading.total} correct ·{' '}
              <Link
                href={`/reading/${reading.id}/review`}
                className="underline underline-offset-4"
              >
                review every question
              </Link>
            </p>
          </div>
        ) : null}

        {writingBand != null && writing ? (
          <div className="space-y-1">
            <BandScale value={writingBand} label="Writing" />
            <p className="text-xs text-muted-foreground tabular-nums">
              <Link
                href={`/writing/${writing.id}/report`}
                className="underline underline-offset-4"
              >
                read the full report
              </Link>
            </p>
          </div>
        ) : stillGrading ? (
          <p className="text-sm text-muted-foreground">
            Your essay is being marked. This page updates itself — you can close
            the tab.
          </p>
        ) : !writing ? (
          <p className="text-sm text-muted-foreground">
            The writing half has not been taken yet.
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="font-title text-title">What to do next</h2>
        <p className="text-sm">{nextAction(planInput)}</p>
        <ComingUp
          plan={buildPlan(planInput)}
          today={todayIso(profile?.timezone)}
          heading="Your plan from here"
        />
      </section>
    </div>
  );
}
