import { after } from 'next/server';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { ComingUp } from '@/components/dashboard/coming-up';
import { SittingResult, sittingBands } from '@/components/exam/sitting-result';
import { capture } from '@/lib/analytics';
import { requireUserId } from '@/lib/auth';
import { todayIso } from '@/lib/dates';
import { getDiagnosticResult, getProfile } from '@/lib/db/queries';
import { overallBand } from '@/lib/grading';
import { buildPlan, nextAction } from '@/lib/study-plan';
import { addDiagnosticSpeaking } from '../../actions';

export const metadata = { title: 'Diagnostic result' };

export default async function DiagnosticResultPage({
  params,
}: PageProps<'/diagnostic/[sittingId]/result'>) {
  const { sittingId } = await params;
  const userId = await requireUserId();

  const [data, profile] = await Promise.all([
    getDiagnosticResult(userId, sittingId),
    getProfile(userId),
  ]);
  if (!data) notFound();

  const bands = sittingBands(data);

  // Every diagnostic now runs Speaking inline, so a sitting that reached the
  // end has a `data.speaking` row. The one exception is a legacy two-skill
  // diagnostic, backfilled with `submittedAt` set and no speaking row — it
  // gets the "add it now" prompt. A sitting still open resumes through
  // `/diagnostic` into its Speaking section rather than landing here, so until
  // it closes we just let SittingResult show its "Not reached yet" line.
  const sittingClosed = data.mock.submittedAt != null;

  if (sittingClosed) {
    const { listening, reading, writing, speaking } = bands;
    const overall =
      listening != null &&
      reading != null &&
      writing != null &&
      speaking != null
        ? overallBand([listening, reading, writing, speaking])
        : null;
    after(() =>
      capture(userId, 'diagnostic_completed', {
        overall_band: overall,
        listening_band: listening,
        reading_band: reading,
        writing_band: writing,
        speaking_band: speaking,
      }),
    );
  }

  const speakingSlot =
    data.speaking || !sittingClosed ? undefined : (
      <div className="flex flex-wrap items-center justify-between gap-4 border border-border px-5 py-4">
        <div className="space-y-1">
          <p className="font-title text-sm">Speaking assessment</p>
          <p className="max-w-prose text-sm text-muted-foreground text-pretty">
            Record a full Parts 1–3 interview — about 5 minutes — and we&apos;ll
            add the fourth band to this result.
          </p>
        </div>
        <form action={addDiagnosticSpeaking}>
          <input type="hidden" name="sittingId" value={data.mock.id} />
          <Button type="submit" size="sm">
            Take your speaking assessment <ArrowRight />
          </Button>
        </form>
      </div>
    );

  const planInput = {
    readingBand: bands.reading,
    writingBand: bands.writing,
    listeningBand: bands.listening,
    targetBand: profile?.targetBand ?? null,
    testDate: profile?.testDate ?? null,
    weaknesses: data.weaknesses,
  };

  return (
    <div className="max-w-2xl space-y-10">
      <SittingResult
        sections={data}
        target={profile?.targetBand ?? null}
        eyebrow="Diagnostic result"
        overallLabel={
          data.speaking
            ? 'Estimate, not an official score'
            : 'Estimate across three skills — not an official score'
        }
        speakingSlot={speakingSlot}
      />

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
