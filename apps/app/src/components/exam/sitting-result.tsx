import Link from 'next/link';
import { BandScale } from '@bandzen/ui/components/band-scale';
import { BandReveal } from '@/components/exam/band-reveal';
import { GradingWatch } from '@/components/app/grading-watch';
import { meanBand } from '@/lib/plan-data';
import { overallBand, writingSectionBand } from '@/lib/grading';
import type { Attempt } from '@/lib/db/schema';

type Section = Attempt | null;

export type SittingSections = {
  listening: Section;
  reading: Section;
  task1: Section;
  task2: Section;
  speaking: Section;
};

const isGrading = (s: string | undefined) =>
  s === 'grading' || s === 'in_progress';

/**
 * Why a section has no band yet: still being marked, marking failed (real
 * IELTS never fails a section — this is what a candidate sees if the speaking
 * grader had nothing to work with), or the section was never reached.
 */
function pendingNote(...statuses: (string | undefined)[]): string {
  if (statuses.some(isGrading)) return 'Being marked';
  if (statuses.some((s) => s === 'failed')) return 'Marking failed';
  return 'Not reached yet';
}

export function sittingBands(s: SittingSections) {
  const listening = s.listening?.band ?? null;
  const reading = s.reading?.band ?? null;
  // A diagnostic has Task 2 only — its band is the writing band. A mock
  // weights the two tasks.
  const writing =
    s.task1?.band != null && s.task2?.band != null
      ? writingSectionBand(s.task1.band, s.task2.band)
      : s.task1 == null
        ? (s.task2?.band ?? null)
        : null;
  const speaking = s.speaking?.band ?? null;
  return { listening, reading, writing, speaking };
}

/**
 * The header + per-skill breakdown shared by the mock and diagnostic result
 * pages. `overall` is the four-skill official rounding when every band is in;
 * a 3-skill diagnostic falls back to the mean of what it measured.
 */
export function SittingResult({
  sections,
  target,
  eyebrow,
  overallLabel = 'Estimate, not an official score',
  speakingSlot,
}: {
  sections: SittingSections;
  target: number | null;
  eyebrow: string;
  overallLabel?: string;
  /** Replaces the Speaking row — the diagnostic uses it for the Pro lock / "add speaking" card. */
  speakingSlot?: React.ReactNode;
}) {
  const bands = sittingBands(sections);
  const measuredSpeaking = sections.speaking != null;

  const overall =
    bands.listening != null && bands.reading != null && bands.writing != null
      ? measuredSpeaking && bands.speaking != null
        ? overallBand([
            bands.listening,
            bands.reading,
            bands.writing,
            bands.speaking,
          ])
        : !measuredSpeaking
          ? meanBand(bands.listening, bands.reading, bands.writing)
          : null
      : null;

  const stillGrading =
    isGrading(sections.task1?.status) ||
    isGrading(sections.task2?.status) ||
    isGrading(sections.speaking?.status);

  const rows: {
    label: string;
    band: number | null;
    pending: string;
    detail: string | null;
    href: string | null;
  }[] = [
    {
      label: 'Listening',
      band: bands.listening,
      pending: 'Not reached yet',
      detail:
        sections.listening?.rawScore != null && sections.listening.total != null
          ? `${sections.listening.rawScore}/${sections.listening.total} correct`
          : null,
      href: null,
    },
    {
      label: 'Reading',
      band: bands.reading,
      pending: 'Not reached yet',
      detail:
        sections.reading?.rawScore != null && sections.reading.total != null
          ? `${sections.reading.rawScore}/${sections.reading.total} correct`
          : null,
      href: null,
    },
    {
      label: 'Writing',
      band: bands.writing,
      pending: pendingNote(sections.task1?.status, sections.task2?.status),
      detail:
        sections.task1?.band != null && sections.task2?.band != null
          ? `Task 1: ${sections.task1.band.toFixed(1)} · Task 2: ${sections.task2.band.toFixed(1)}`
          : null,
      href: sections.task2
        ? `/writing/${sections.task2.id}/report`
        : sections.task1
          ? `/writing/${sections.task1.id}/report`
          : null,
    },
    {
      label: 'Speaking',
      band: bands.speaking,
      pending: pendingNote(sections.speaking?.status),
      detail: null,
      href: sections.speaking ? `/speaking/${sections.speaking.id}/report` : null,
    },
  ];

  return (
    <>
      {sections.task1 && isGrading(sections.task1.status) ? (
        <GradingWatch attemptId={sections.task1.id} />
      ) : null}
      {sections.task2 && isGrading(sections.task2.status) ? (
        <GradingWatch attemptId={sections.task2.id} />
      ) : null}
      {sections.speaking && isGrading(sections.speaking.status) ? (
        <GradingWatch attemptId={sections.speaking.id} />
      ) : null}

      <header className="space-y-4">
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          {eyebrow}
        </p>
        {overall != null ? (
          <>
            <BandReveal value={overall} target={target ?? undefined} />
            <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
              {overallLabel}
            </p>
          </>
        ) : (
          <h1 className="font-title text-title-lg">
            {stillGrading ? 'Marking your work' : 'In progress'}
          </h1>
        )}
      </header>

      <section className="space-y-6">
        <h2 className="font-title text-title">By skill</h2>
        {rows.map((r) =>
          r.label === 'Speaking' && speakingSlot !== undefined ? (
            <div key="Speaking">{speakingSlot}</div>
          ) : (
            <div key={r.label} className="space-y-1">
              {r.band != null ? (
                <BandScale value={r.band} label={r.label} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {r.label} — {r.pending}
                </p>
              )}
              {r.detail || r.href ? (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {r.detail}
                  {r.detail && r.href ? ' · ' : ''}
                  {r.href ? (
                    <Link href={r.href} className="underline underline-offset-4">
                      read the full report
                    </Link>
                  ) : null}
                </p>
              ) : null}
            </div>
          ),
        )}
      </section>
    </>
  );
}
