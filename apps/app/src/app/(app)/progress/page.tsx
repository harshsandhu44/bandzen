import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BandScale } from '@bandzen/ui/components/band-scale';
import { BandTrend } from '@bandzen/ui/components/band-trend';
import { Button } from '@bandzen/ui/components/button';
import {
  EmptyState,
  Eyebrow,
  Metric,
  PageHeader,
  SectionHeader,
} from '@/components/app/primitives';
import {
  LockedModule,
  SkillStatus,
  toSkillLevel,
} from '@/components/app/status';
import { requireUserId } from '@/lib/auth';
import {
  accuracyByQuestionKind,
  activitySummary,
  bandHistory,
  getProfile,
  isPro,
  listCompletedAttempts,
  listLessonProgress,
} from '@/lib/db/queries';
import { ProTag } from '@/components/billing/pro';
import { MODULE_LABEL, QUESTION_KIND_LABEL } from '@/lib/modules';
import { meanBand } from '@/lib/plan-data';
import type { Skill } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Progress' };

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
});

/** Below this an accuracy rate is noise, not a pattern. */
const MIN_ATTEMPTED = 5;

/** How far back the trend goes without Pro. */
const FREE_TREND_POINTS = 5;

export default async function ProgressPage() {
  const userId = await requireUserId();

  const [profile, history, accuracy, activity, lessons, attempts, pro] =
    await Promise.all([
      getProfile(userId),
      bandHistory(userId),
      accuracyByQuestionKind(userId),
      activitySummary(userId),
      listLessonProgress(userId),
      listCompletedAttempts(userId, 50),
      isPro(userId),
    ]);

  // Below MIN_ATTEMPTED a rate is noise, so it cannot name a pattern.
  const ranked = accuracy
    .filter((k) => k.total >= MIN_ATTEMPTED)
    .sort((a, b) => a.accuracy - b.accuracy);

  const allPoints = history
    .filter((h) => h.band != null && h.submittedAt != null)
    .map((h) => ({
      value: h.band!,
      label: `${MODULE_LABEL[h.module]} ${DATE.format(h.submittedAt!)}`,
      module: h.module,
    }));

  // Free sees the recent window; Pro sees the lot. The gate is depth rather
  // than a whole section, because the matrix and the patterns below are what
  // tell a candidate which question type is costing them marks — gate those
  // and free practice becomes aimless drilling, which converts nobody.
  //
  // It also strengthens on its own: a new candidate loses nothing, and the
  // longer someone practises the more of their own history sits behind it.
  const hidden = pro ? 0 : Math.max(0, allPoints.length - FREE_TREND_POINTS);
  const points = hidden ? allPoints.slice(-FREE_TREND_POINTS) : allPoints;

  const byModule = (module: Skill) => points.filter((p) => p.module === module);
  const latest = (module: Skill) => byModule(module).at(-1)?.value ?? null;

  const reading = latest('reading');
  const writing = latest('writing');
  const overall =
    reading != null && writing != null
      ? meanBand(reading, writing)
      : (reading ?? writing);

  if (!points.length) {
    return (
      <div className="max-w-5xl space-y-8">
        <PageHeader eyebrow="Progress" title="Your progression" />
        <EmptyState
          title="No results yet"
          description="Progress is measured from completed attempts. Take the diagnostic and this page starts filling in."
          action={
            <Button
              size="sm"
              nativeButton={false}
              render={<Link href="/diagnostic" />}
            >
              Take the diagnostic
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-10">
      <PageHeader
        eyebrow="Progress"
        title="Your progression"
        description="Every figure here is measured from attempts you have completed. Nothing is projected."
      />

      <section aria-labelledby="overall-heading" className="space-y-4">
        <SectionHeader as="h2">
          <span id="overall-heading">Estimated Band over time</span>
        </SectionHeader>

        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <Metric
            label="Estimated Band"
            value={overall != null ? overall.toFixed(1) : '—'}
            size="lg"
            hint="An estimate produced by Bandzen, not an official IELTS score."
          />
          {profile?.targetBand != null ? (
            <Metric label="Target" value={profile.targetBand.toFixed(1)} />
          ) : null}
        </div>

        <BandTrend
          points={points}
          target={profile?.targetBand ?? undefined}
          // Reading and writing attempts share this line, so first -> last
          // would subtract one skill's band from the other's and call the
          // difference progress. The per-module trends below say it properly.
          delta={new Set(points.map((p) => p.module)).size === 1}
          caption={
            hidden
              ? `Your last ${FREE_TREND_POINTS} attempts, oldest first`
              : 'All attempts, oldest first'
          }
        />

        {/* A true peek: the count is this candidate's own rows, not a
            decoration. Nothing here is invented to make the number look
            better. */}
        {hidden ? (
          <div className="relative overflow-hidden border border-border">
            <div
              aria-hidden
              className="h-10 bg-gradient-to-b from-secondary/60 to-transparent"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-4">
              <p className="flex items-center gap-2 text-sm">
                <ProTag />
                <span className="tabular-nums">
                  {hidden} earlier {hidden === 1 ? 'attempt' : 'attempts'} not
                  shown
                </span>
              </p>
              <Link
                href="/upgrade?from=progress_peek"
                className="text-sm underline underline-offset-4"
              >
                See your full history
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="modules-heading" className="space-y-4">
        <SectionHeader as="h2">
          <span id="modules-heading">By module</span>
        </SectionHeader>

        {(['reading', 'writing'] as const).map((module) => {
          const modulePoints = byModule(module);
          if (!modulePoints.length) {
            return (
              <div
                key={module}
                className="flex items-baseline justify-between gap-4 border-b border-border pb-3"
              >
                <p className="text-sm">{MODULE_LABEL[module]}</p>
                <Eyebrow>Not measured</Eyebrow>
              </div>
            );
          }
          return (
            <div key={module} className="space-y-3">
              <BandScale
                value={modulePoints.at(-1)!.value}
                target={profile?.targetBand ?? undefined}
                label={MODULE_LABEL[module]}
              />
              {modulePoints.length > 1 ? (
                <BandTrend
                  points={modulePoints}
                  target={profile?.targetBand ?? undefined}
                  caption={`${MODULE_LABEL[module]} attempts`}
                />
              ) : null}
            </div>
          );
        })}

        <LockedModule module="listening" />
        <LockedModule module="speaking" />
      </section>

      {accuracy.length ? (
        <section aria-labelledby="matrix-heading" className="space-y-3">
          <SectionHeader as="h2">
            <span id="matrix-heading">Reading skill matrix</span>
          </SectionHeader>

          <table className="w-full">
            <caption className="sr-only">
              Accuracy by reading question type
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-2 text-left">
                  <Eyebrow as="span">Question type</Eyebrow>
                </th>
                <th scope="col" className="py-2 text-right">
                  <Eyebrow as="span">Correct</Eyebrow>
                </th>
                <th scope="col" className="py-2 text-right">
                  <Eyebrow as="span">Status</Eyebrow>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...accuracy]
                .sort((a, b) => a.accuracy - b.accuracy)
                .map((k) => (
                  <tr key={k.kind}>
                    <th
                      scope="row"
                      className="py-2.5 text-left text-sm font-normal"
                    >
                      {QUESTION_KIND_LABEL[
                        k.kind as keyof typeof QUESTION_KIND_LABEL
                      ] ?? k.kind}
                    </th>
                    <td className="py-2.5 text-right font-metric text-metric-sm">
                      {k.correct}/{k.total}
                    </td>
                    <td className="py-2.5 text-right">
                      {k.total >= MIN_ATTEMPTED ? (
                        <SkillStatus level={toSkillLevel(k.accuracy)} />
                      ) : (
                        <Eyebrow as="span">Too few</Eyebrow>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      ) : null}

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
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {k.total - k.correct} wrong of {k.total} attempted
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-4">
                    <SkillStatus level={toSkillLevel(k.accuracy)} />
                    <Link
                      href={`/reading?kind=${k.kind}`}
                      className="text-xs underline-offset-4 hover:underline"
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
                  <p className="text-sm">
                    {MODULE_LABEL[a.module]}
                    {a.kind !== 'practice' ? ` · ${a.kind}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {a.submittedAt ? DATE.format(a.submittedAt) : ''}
                  </p>
                </div>
                <span className="flex items-center gap-5">
                  <span className="font-metric text-metric-sm">
                    {a.band?.toFixed(1) ?? '—'}
                  </span>
                  <Link
                    href={`/review/${a.id}`}
                    className="inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
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

      <section aria-labelledby="activity-heading" className="space-y-3">
        <SectionHeader as="h2">
          <span id="activity-heading">Activity</span>
        </SectionHeader>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Metric label="Tests completed" value={activity.attempts} />
          <Metric label="Questions attempted" value={activity.questions} />
          <Metric label="Minutes in tests" value={activity.minutes} />
          <Metric label="Lessons finished" value={lessons.length} />
        </div>

        <p className="max-w-prose text-xs text-muted-foreground">
          Minutes count time spent inside timed attempts only. We do not track
          how long you spend reading a lesson, so it is not included rather than
          estimated.
        </p>
      </section>
    </div>
  );
}
