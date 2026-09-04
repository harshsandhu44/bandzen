import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Check, Circle, Lock } from 'lucide-react';
import { Breadcrumb } from '@/components/app/breadcrumb';
import { PageHeader, Panel } from '@/components/app/primitives';
import { GROUP_TITLE, type LessonGroup } from '@/content/lesson-types';
import { lessonsForModule } from '@/content/lessons';
import { LearnNav } from '@/components/learning/learn-nav';
import { requireUserId } from '@/lib/auth';
import { listLessonProgress } from '@/lib/db/queries';
import {
  IELTS_MODULES,
  MODULE_LABEL,
  UNAVAILABLE_REASON,
  isAvailable,
  type IELTSModule,
} from '@/lib/modules';
import { cn } from '@bandzen/ui/lib/utils';

const GROUP_ORDER: readonly LessonGroup[] = [
  'foundations',
  'question-types',
  'advanced',
];

export function generateStaticParams() {
  return IELTS_MODULES.map((module) => ({ module }));
}

export async function generateMetadata({
  params,
}: PageProps<'/learn/[module]'>) {
  const { module } = await params;
  const current = module as IELTSModule;
  return {
    title: IELTS_MODULES.includes(current)
      ? `${MODULE_LABEL[current]} · Learn`
      : 'Learn',
  };
}

export default async function LearnModulePage({
  params,
}: PageProps<'/learn/[module]'>) {
  const { module } = await params;
  if (!IELTS_MODULES.includes(module as IELTSModule)) notFound();
  const current = module as IELTSModule;

  const userId = await requireUserId();
  const progress = await listLessonProgress(userId);
  const done = new Set(progress.map((p) => p.lessonId));

  const lessons = isAvailable(current) ? await lessonsForModule(current) : [];
  const written = lessons.filter((l) => l.stages);
  const complete = written.filter((l) => done.has(l.id)).length;
  const next = written.find((l) => !done.has(l.id));

  return (
    <div className="max-w-3xl space-y-6">
      <Breadcrumb
        segments={[
          { label: 'Learn', href: '/learn' },
          { label: MODULE_LABEL[current] },
        ]}
      />

      <PageHeader
        eyebrow="Learn"
        title={`${MODULE_LABEL[current]} technique`}
        description="Each lesson ends by sending you to practise what it just taught."
        action={
          isAvailable(current) && written.length ? (
            <div className="text-right">
              <p className="font-metric text-metric-sm">
                {complete} / {written.length}
              </p>
              <p className="font-mono text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase">
                lessons done
              </p>
            </div>
          ) : undefined
        }
      />

      <LearnNav current={current} />

      {!isAvailable(current) ? (
        <div className="flex items-start gap-3 border border-dashed border-border px-5 py-8">
          <Lock
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div>
            <p className="font-title text-title">
              No {MODULE_LABEL[current]} lessons yet
            </p>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              {UNAVAILABLE_REASON[current]} The lessons will follow the practice
              material rather than arrive ahead of it.
            </p>
          </div>
        </div>
      ) : (
        <>
          {next ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border border-border border-l-2 border-l-chrome bg-secondary/30 px-4 py-3">
              <div>
                <p className="font-mono text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase">
                  Start next
                </p>
                <p className="mt-0.5 text-sm font-medium">
                  {next.title} · {next.minutes} min
                </p>
              </div>
              <Link
                href={`/learn/${current}/${next.id}`}
                className="inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline"
              >
                Open
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          ) : null}

          {GROUP_ORDER.map((group) => {
            const inGroup = lessons.filter((l) => l.group === group);
            if (!inGroup.length) return null;
            const groupWritten = inGroup.filter((l) => l.stages);
            const groupDone = groupWritten.filter((l) => done.has(l.id)).length;

            return (
              <Panel
                key={group}
                headingId={`group-${group}`}
                title={GROUP_TITLE[group]}
                action={
                  groupWritten.length ? (
                    <span className="font-metric text-metric-sm text-muted-foreground">
                      {groupDone} / {groupWritten.length}
                    </span>
                  ) : undefined
                }
              >
                <ul className="-my-2.5 divide-y divide-border">
                  {inGroup.map((lesson) => {
                    const finished = done.has(lesson.id);
                    const unwritten = !lesson.stages;

                    const row = (
                      <div className="flex items-start gap-3 py-2.5">
                        {finished ? (
                          <Check
                            className="mt-0.5 size-3.5 shrink-0 text-primary"
                            aria-hidden
                          />
                        ) : (
                          <Circle
                            className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50"
                            aria-hidden
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              'text-sm font-medium',
                              unwritten && 'text-muted-foreground',
                            )}
                          >
                            {lesson.title}
                          </p>
                          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
                            {lesson.summary}
                          </p>
                        </div>
                        <span className="shrink-0 self-center font-mono text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase tabular-nums">
                          {unwritten
                            ? 'Not written yet'
                            : finished
                              ? 'Done'
                              : `${lesson.minutes} min`}
                        </span>
                      </div>
                    );

                    return (
                      <li key={lesson.id}>
                        {unwritten ? (
                          row
                        ) : (
                          <Link
                            href={`/learn/${current}/${lesson.id}`}
                            className="-mx-4 block px-4 transition-colors hover:bg-secondary/40"
                          >
                            {row}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            );
          })}
        </>
      )}
    </div>
  );
}
