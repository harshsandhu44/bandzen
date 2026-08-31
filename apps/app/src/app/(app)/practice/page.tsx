import Link from 'next/link';
import { ArrowRight, Lock } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { PageHeader, SectionHeader } from '@/components/app/primitives';
import { SkillStatus, toSkillLevel } from '@/components/app/status';
import { requireUserId } from '@/lib/auth';
import { accuracyByQuestionKind } from '@/lib/db/queries';
import {
  IELTS_MODULES,
  MODULE_LABEL,
  QUESTION_KIND_LABEL,
  UNAVAILABLE_REASON,
  isAvailable,
} from '@/lib/modules';

export const metadata = { title: 'Practice' };

/** Below this a rate is noise, so it cannot recommend anything. */
const MIN_ATTEMPTED = 5;

const MODULE_HREF: Record<string, string> = {
  reading: '/reading',
  writing: '/writing',
};

const MODULE_BLURB: Record<string, string> = {
  reading: 'Timed passages, filtered by the question type you want to drill.',
  writing: 'Task 2 prompts, graded against the four IELTS criteria.',
};

export default async function PracticePage() {
  const userId = await requireUserId();
  const accuracy = await accuracyByQuestionKind(userId);

  // Smart Practice names real weaknesses or it does not appear. A generated
  // session over question types nobody has attempted would be a guess dressed
  // up as a recommendation.
  const weak = accuracy
    .filter((k) => k.total >= MIN_ATTEMPTED && k.accuracy < 0.75)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  return (
    <div className="max-w-3xl space-y-10">
      <PageHeader
        eyebrow="Practice"
        title="What do you want to practise?"
        description="Short, focused sessions. Everything here is scored the same way the mock tests are."
      />

      <section aria-labelledby="modules-heading" className="space-y-3">
        <SectionHeader as="h2">
          <span id="modules-heading">By module</span>
        </SectionHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {IELTS_MODULES.map((module) =>
            isAvailable(module) ? (
              <Link
                key={module}
                href={MODULE_HREF[module]!}
                className="group flex flex-col justify-between gap-6 border border-border p-5 transition-colors hover:border-foreground/30"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{MODULE_LABEL[module]}</p>
                  <p className="text-sm text-muted-foreground text-pretty">
                    {MODULE_BLURB[module]}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] tracking-[0.2em] uppercase">
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
                  <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
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
      </section>

      <section aria-labelledby="smart-heading" className="space-y-3">
        <SectionHeader as="h2">
          <span id="smart-heading">Smart practice</span>
        </SectionHeader>

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
                  key={k.kind}
                  className="flex items-center justify-between gap-4 py-2.5"
                >
                  <span className="text-sm">
                    {QUESTION_KIND_LABEL[
                      k.kind as keyof typeof QUESTION_KIND_LABEL
                    ] ?? k.kind}
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
              render={<Link href={`/reading?kind=${weak[0]!.kind}`} />}
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
            <p className="text-sm font-medium">Not enough data yet</p>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground text-pretty">
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
      </section>
    </div>
  );
}
