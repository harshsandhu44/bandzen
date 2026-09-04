import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { Eyebrow, PageHeader, Panel } from '@/components/app/primitives';
import { SkillStatus, toSkillLevel } from '@/components/app/status';
import { requireUserId } from '@/lib/auth';
import {
  accuracyByQuestionKind,
  diagnosticCount,
  isPro,
  latestDiagnostic,
} from '@/lib/db/queries';
import { canStartDiagnostic } from '@/lib/entitlements';
import { ProTag } from '@/components/billing/pro';
import {
  IELTS_MODULES,
  MODULE_LABEL,
  QUESTION_KIND_LABEL,
  UNAVAILABLE_REASON,
  isAvailable,
} from '@/lib/modules';
import { DIAGNOSTIC_DURATION_LABEL } from '@/lib/timing';

export const metadata = { title: 'Practice' };

/** Below this a rate is noise, so it cannot recommend anything. */
const MIN_ATTEMPTED = 5;

const MODULE_HREF: Record<string, string> = {
  reading: '/reading',
  writing: '/writing',
  listening: '/listening',
  speaking: '/speaking',
};

const MODULE_BLURB: Record<string, string> = {
  reading: 'Timed passages, filtered by the question type you want to drill.',
  writing: 'Task 2 prompts, graded against the four IELTS criteria.',
  listening: 'Tracks that play once, exactly as they do in the exam.',
  speaking:
    'A full Parts 1–3 interview. Record each answer; graded from your audio. Pro.',
};

/**
 * Everything a candidate can attempt, in the order a candidate needs it:
 * what their own results recommend, then the modules, then the heavier timed
 * tests.
 *
 * /tests folded in here. Its "Section tests" tab sent people to /reading and
 * /writing, which is what "By module" below already does, and its "Completed"
 * tab listed the same fifty attempts as /progress. The diagnostic entry point
 * was the only thing it owned.
 */
export default async function PracticePage() {
  const userId = await requireUserId();
  const [accuracy, diagnostic, taken, pro] = await Promise.all([
    accuracyByQuestionKind(userId),
    latestDiagnostic(userId),
    diagnosticCount(userId),
    isPro(userId),
  ]);

  // The first sitting is free and off-quota; retaking is Pro. Without this the
  // button below said "Take another diagnostic" to everyone, and for a free
  // candidate that was a promise the action would not keep.
  const canRetake = canStartDiagnostic({ isPro: pro, taken });

  // Smart Practice names real weaknesses or it does not appear. A generated
  // session over question types nobody has attempted would be a guess dressed
  // up as a recommendation.
  const weak = accuracy
    .filter((k) => k.total >= MIN_ATTEMPTED && k.accuracy < 0.75)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  return (
    <div className="max-w-5xl space-y-4">
      <PageHeader
        eyebrow="Practice"
        title="What do you want to practise?"
        description="Short, focused sessions and full timed tests. Everything here is scored the same way."
      />

      <Panel headingId="smart-heading" title="Smart practice">
        {weak.length ? (
          <div className="border-l-2 border-chrome bg-secondary/30 py-5 pr-5 pl-5">
            <p className="text-sm font-medium">
              Practise your weakest question types
            </p>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground text-pretty">
              Based on every question you have answered so far, these are
              costing you the most marks.
            </p>

            <ul className="mt-4 divide-y divide-border border-y border-border">
              {weak.map((k) => (
                <li
                  key={`${k.module}-${k.kind}`}
                  className="flex items-center justify-between gap-4 py-2.5"
                >
                  <span className="text-sm">
                    {QUESTION_KIND_LABEL[
                      k.kind as keyof typeof QUESTION_KIND_LABEL
                    ] ?? k.kind}
                    <span className="ml-2 font-mono text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase">
                      {MODULE_LABEL[k.module]}
                    </span>
                  </span>
                  <span className="flex items-center gap-4">
                    <span className="font-metric text-metric-sm text-muted-foreground">
                      {k.correct}/{k.total}
                    </span>
                    <SkillStatus level={toSkillLevel(k.accuracy)} />
                  </span>
                </li>
              ))}
            </ul>

            <Button
              className="mt-5"
              nativeButton={false}
              render={
                <Link
                  href={`${MODULE_HREF[weak[0]!.module]}?kind=${weak[0]!.kind}`}
                />
              }
            >
              Practise{' '}
              {QUESTION_KIND_LABEL[
                weak[0]!.kind as keyof typeof QUESTION_KIND_LABEL
              ] ?? weak[0]!.kind}
              <ArrowRight />
            </Button>
          </div>
        ) : (
          <div className="border border-dashed border-border px-6 py-8">
            <p className="font-title text-title">Not enough data yet</p>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground text-pretty">
              Once you have answered at least {MIN_ATTEMPTED} questions of a
              type, we can tell a weakness from a bad day. Until then, a
              recommendation would be a guess.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              nativeButton={false}
              render={<Link href="/diagnostic" />}
            >
              Take the diagnostic
            </Button>
          </div>
        )}
      </Panel>

      <Panel headingId="modules-heading" title="By module">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {IELTS_MODULES.map((module) =>
            isAvailable(module) ? (
              <Link
                key={module}
                href={MODULE_HREF[module]!}
                className="group flex flex-col justify-between gap-6 border border-border p-5 transition-colors hover:border-foreground/30"
              >
                <div className="space-y-1">
                  <p className="font-title text-sm">{MODULE_LABEL[module]}</p>
                  <p className="text-sm text-muted-foreground text-pretty">
                    {MODULE_BLURB[module]}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                  Start
                  <ArrowRight
                    className="size-3 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            ) : (
              <div
                key={module}
                className="flex flex-col gap-6 border border-dashed border-border p-5"
              >
                <div className="space-y-1">
                  <p className="flex items-center gap-2 font-title text-sm text-muted-foreground">
                    <Lock className="size-3.5 shrink-0" aria-hidden />
                    {MODULE_LABEL[module]}
                  </p>
                  <p className="text-sm text-muted-foreground text-pretty">
                    {UNAVAILABLE_REASON[module]}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
      </Panel>

      <Panel headingId="tests-heading" title="Sit a test">
        <article className="border border-border">
          <div className="border-b border-border px-5 py-4">
            <h3 className="font-title text-title">Diagnostic</h3>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground text-pretty">
              One reading passage and one Task 2 essay, back to back. The
              fastest way to get a first estimate in both skills and a plan
              built around it.
            </p>
          </div>

          <dl className="grid grid-cols-2 divide-x divide-y divide-border border-b border-border sm:grid-cols-4 sm:divide-y-0">
            {[
              ['Sections', 'Reading · Writing'],
              ['Duration', DIAGNOSTIC_DURATION_LABEL],
              ['Difficulty', 'Easier than exam'],
              ['Status', diagnostic ? 'Attempted' : 'Not attempted'],
            ].map(([label, value]) => (
              <div key={label} className="px-5 py-3">
                <Eyebrow as="dt">{label!}</Eyebrow>
                <dd className="mt-0.5 text-sm tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="space-y-3 px-5 py-4">
            {canRetake ? (
              <Button nativeButton={false} render={<Link href="/diagnostic" />}>
                {taken ? 'Take another diagnostic' : 'Start diagnostic'}
                <ArrowRight />
              </Button>
            ) : (
              <>
                <Button variant="outline" disabled>
                  Retake diagnostic <ProTag className="ml-2" />
                </Button>
                <p className="max-w-prose text-sm text-muted-foreground text-pretty">
                  You have had your free diagnostic. Retaking it is how you find
                  out whether you have actually moved — Pro includes as many as
                  you want.
                </p>
              </>
            )}
            {diagnostic ? (
              <Link
                href={`/diagnostic/${diagnostic.id}/result`}
                className="block text-sm underline underline-offset-4"
              >
                See your last result
              </Link>
            ) : null}
          </div>
        </article>

        {/* The honest state of a four-skill mock: it does not exist, and saying
            so is better than a card that cannot be started. */}
        <div className="flex items-start gap-3 border border-dashed border-border px-5 py-6">
          <Lock
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div>
            <p className="font-title text-sm">Full four-skill mock</p>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground text-pretty">
              All four modules exist now, but a single sitting that chains them
              under one timer and one combined band is still being built.
              Practise them individually above in the meantime.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
