import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BandScale } from '@bandzen/ui/components/band-scale';
import { BandReveal } from '@/components/exam/band-reveal';
import { GradingWatch } from '@/components/app/grading-watch';
import { requireUserId } from '@/lib/auth';
import { getMockResult, getProfile } from '@/lib/db/queries';
import { overallBand, writingSectionBand } from '@/lib/grading';

export const metadata = { title: 'Mock test result' };

const grading = (status: string | undefined) =>
  status === 'grading' || status === 'in_progress';

/**
 * Every status a still-bandless section can be in: not reached at all, its
 * grader running, or the grader having failed terminally (real IELTS never
 * fails to mark a section — this is what a candidate sees if the speaking
 * grader has nothing to work with, e.g. no audio was recorded). Writing has
 * two rows; grading in progress on either outranks a failure on the other.
 */
function sectionNote(...statuses: (string | undefined)[]): string {
  if (statuses.some((s) => s === 'grading' || s === 'in_progress'))
    return 'Being marked';
  if (statuses.some((s) => s === 'failed')) return 'Marking failed';
  return 'Not reached yet';
}

export default async function MockResultPage({
  params,
}: PageProps<'/mock/[mockAttemptId]/result'>) {
  const { mockAttemptId } = await params;
  const userId = await requireUserId();

  const [data, profile] = await Promise.all([
    getMockResult(userId, mockAttemptId),
    getProfile(userId),
  ]);
  if (!data) notFound();

  const { listening, reading, task1, task2, speaking } = data;

  const listeningBand = listening?.band ?? null;
  const readingBand = reading?.band ?? null;
  const writingBand =
    task1?.band != null && task2?.band != null
      ? writingSectionBand(task1.band, task2.band)
      : null;
  const speakingBand = speaking?.band ?? null;

  const overall =
    listeningBand != null &&
    readingBand != null &&
    writingBand != null &&
    speakingBand != null
      ? overallBand([listeningBand, readingBand, writingBand, speakingBand])
      : null;

  const stillGrading =
    grading(task1?.status) ||
    grading(task2?.status) ||
    grading(speaking?.status);

  const skills: {
    label: string;
    band: number | null;
    /** Shown only while `band` is null. */
    pending: string;
    detail: string | null;
    href: string | null;
  }[] = [
    {
      label: 'Listening',
      band: listeningBand,
      pending: 'Not reached yet',
      detail:
        listening?.rawScore != null && listening.total != null
          ? `${listening.rawScore}/${listening.total} correct`
          : null,
      href: null,
    },
    {
      label: 'Reading',
      band: readingBand,
      pending: 'Not reached yet',
      detail:
        reading?.rawScore != null && reading.total != null
          ? `${reading.rawScore}/${reading.total} correct`
          : null,
      href: null,
    },
    {
      label: 'Writing',
      band: writingBand,
      pending: sectionNote(task1?.status, task2?.status),
      detail:
        task1?.band != null && task2?.band != null
          ? `Task 1: ${task1.band.toFixed(1)} · Task 2: ${task2.band.toFixed(1)}`
          : null,
      href: task2
        ? `/writing/${task2.id}/report`
        : task1
          ? `/writing/${task1.id}/report`
          : null,
    },
    {
      label: 'Speaking',
      band: speakingBand,
      pending: sectionNote(speaking?.status),
      detail: null,
      href: speaking ? `/speaking/${speaking.id}/report` : null,
    },
  ];

  return (
    <div className="max-w-2xl space-y-10">
      {task1 && grading(task1.status) ? (
        <GradingWatch attemptId={task1.id} />
      ) : null}
      {task2 && grading(task2.status) ? (
        <GradingWatch attemptId={task2.id} />
      ) : null}
      {speaking && grading(speaking.status) ? (
        <GradingWatch attemptId={speaking.id} />
      ) : null}

      <header className="space-y-4">
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          Mock test result
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
            {stillGrading
              ? 'Marking your essays and your speaking'
              : 'Mock test in progress'}
          </h1>
        )}
      </header>

      <section className="space-y-6">
        <h2 className="font-title text-title">By skill</h2>
        {skills.map((s) => (
          <div key={s.label} className="space-y-1">
            {s.band != null ? (
              <BandScale value={s.band} label={s.label} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {s.label} — {s.pending}
              </p>
            )}
            {s.detail || s.href ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                {s.detail}
                {s.detail && s.href ? ' · ' : ''}
                {s.href ? (
                  <Link href={s.href} className="underline underline-offset-4">
                    read the full report
                  </Link>
                ) : null}
              </p>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
}
