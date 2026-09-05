import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BandScale } from '@bandzen/ui/components/band-scale';
import { BandTrend } from '@bandzen/ui/components/band-trend';
import { Button } from '@bandzen/ui/components/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@bandzen/ui/components/tabs';
import { BandChart } from '@/components/progress/band-chart';
import {
  EmptyState,
  Eyebrow,
  Metric,
  PageHeader,
  Panel,
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
  listAwards,
  listCompletedAttempts,
  listLessonProgress,
} from '@/lib/db/queries';
import { AwardWall } from '@/components/awards/award-wall';
import { ProTag } from '@/components/billing/pro';
import {
  AVAILABLE_MODULES,
  IELTS_MODULES,
  MODULE_LABEL,
  QUESTION_KIND_LABEL,
  isAvailable,
} from '@/lib/modules';
import { meanBand } from '@/lib/plan-data';
import type { Skill } from '@/lib/db/schema';

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

  const [profile, history, accuracy, activity, lessons, attempts, pro, awards] =
    await Promise.all([
      getProfile(userId),
      bandHistory(userId),
      accuracyByQuestionKind(userId, 'reading'),
      activitySummary(userId),
      listLessonProgress(userId),
      listCompletedAttempts(userId, 50),
      isPro(userId),
      listAwards(userId),
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
  const listening = latest('listening');
  const speaking = latest('speaking');
  const overall = meanBand(reading, writing, listening, speaking);

  if (!points.length) {
    return (
      <div className="max-w-6xl space-y-8">
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
    <div className="max-w-6xl space-y-4">
      <PageHeader
        eyebrow="Progress"
        title="Your progression"
        description="Every figure here is measured from attempts you have completed. Nothing is projected."
      />

      <Panel
        headingId="overall-heading"
        title="Estimated band over time"
        action={
          <Metric
            label="Estimated band"
            value={overall != null ? overall.toFixed(1) : '—'}
            hint={
              profile?.targetBand != null
                ? `Target ${profile.targetBand.toFixed(1)}`
                : undefined
            }
          />
        }
      >
        <BandChart points={points} target={profile?.targetBand ?? undefined} />
        <p className="mt-2 font-mono text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase">
          {hidden
            ? `Your last ${FREE_TREND_POINTS} attempts, oldest first`
            : 'All attempts, oldest first'}
        </p>

        {/* The gate is depth, not a whole section — a new candidate loses
            nothing, and the longer someone practises the more of their own
            history sits behind it. */}
        {hidden ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-border border-l-2 border-l-chrome bg-secondary/30 px-4 py-3">
            <p className="flex items-center gap-2 text-sm">
              <ProTag />
              <span className="tabular-nums">
                {hidden} earlier {hidden === 1 ? 'attempt is' : 'attempts are'}{' '}
                not shown
              </span>
            </p>
            <Link
              href="/upgrade?from=progress_peek"
              className="text-sm underline underline-offset-4 hover:text-foreground"
            >
              See your full history
            </Link>
          </div>
        ) : null}
      </Panel>

      <Panel headingId="breakdown-heading" title="Breakdown">
        <Tabs defaultValue="modules">
          <TabsList variant="line" className="mb-4">
            <TabsTrigger value="modules">By module</TabsTrigger>
            {accuracy.length ? (
              <TabsTrigger value="matrix">Reading skill matrix</TabsTrigger>
            ) : null}
            {ranked.length ? (
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="modules">
            <div className="space-y-4">
              {AVAILABLE_MODULES.map((module) => {
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

              {IELTS_MODULES.filter((m) => !isAvailable(m)).map((module) => (
                <LockedModule key={module} module={module} />
              ))}
            </div>
          </TabsContent>

          {accuracy.length ? (
            <TabsContent value="matrix">
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
            </TabsContent>
          ) : null}

          {ranked.length ? (
            <TabsContent value="patterns">
              <ul className="-my-2.5 divide-y divide-border">
                {ranked.map((k) => {
                  const label =
                    QUESTION_KIND_LABEL[
                      k.kind as keyof typeof QUESTION_KIND_LABEL
                    ] ?? k.kind;
                  return (
                    <li
                      key={k.kind}
                      className="flex items-center justify-between gap-4 py-2.5"
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
            </TabsContent>
          ) : null}
        </Tabs>
      </Panel>

      <Panel headingId="activity-heading" title="Activity">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Metric label="Tests completed" value={activity.attempts} />
          <Metric label="Questions attempted" value={activity.questions} />
          <Metric label="Minutes in tests" value={activity.minutes} />
          <Metric label="Lessons finished" value={lessons.length} />
        </div>

        <p className="mt-4 max-w-prose text-xs text-muted-foreground">
          Minutes count time spent inside timed attempts only. We do not track
          how long you spend reading a lesson, so it is not included rather than
          estimated.
        </p>
      </Panel>

      <AwardWall awards={awards} />

      <Panel headingId="attempts-heading" title="Marked attempts">
        {attempts.length ? (
          <ul className="-my-2.5 divide-y divide-border">
            {attempts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-4 py-2.5"
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
      </Panel>
    </div>
  );
}
