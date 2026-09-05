import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { ProLocked } from '@/components/billing/pro';
import { ComingUp } from '@/components/dashboard/coming-up';
import {
  SittingResult,
  sittingBands,
} from '@/components/exam/sitting-result';
import { requireUserId } from '@/lib/auth';
import { todayIso } from '@/lib/dates';
import { getDiagnosticResult, getProfile, isPro } from '@/lib/db/queries';
import { buildPlan, nextAction } from '@/lib/study-plan';
import { addDiagnosticSpeaking } from '../../actions';

export const metadata = { title: 'Diagnostic result' };

export default async function DiagnosticResultPage({
  params,
}: PageProps<'/diagnostic/[sittingId]/result'>) {
  const { sittingId } = await params;
  const userId = await requireUserId();

  const [data, profile, pro] = await Promise.all([
    getDiagnosticResult(userId, sittingId),
    getProfile(userId),
    isPro(userId),
  ]);
  if (!data) notFound();

  const bands = sittingBands(data);

  // The Speaking row. Only meaningful once the rest of the sitting has closed
  // (a Free sitting ends at Writing; a Pro sitting that reached Speaking has a
  // `data.speaking` row). Until then, let SittingResult show the default
  // "Not reached yet" line.
  const sittingClosed = data.mock.submittedAt != null;

  // A real band once the row exists, a Pro lock for a Free candidate, or a
  // "take it now" prompt once they upgrade.
  const speakingSlot = data.speaking || !sittingClosed ? undefined : pro ? (
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
  ) : (
    <ProLocked
      title="Speaking assessment"
      description="Your diagnostic measured Listening, Reading and Writing. Speaking is graded from your audio on Pro — unlock it to complete the picture."
      source="diagnostic_speaking_wall"
    />
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
