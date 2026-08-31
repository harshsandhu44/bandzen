import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, Circle, Lock } from 'lucide-react';
import { PageHeader, SectionHeader } from '@/components/app/primitives';
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

export default async function LearnModulePage({
  params,
}: PageProps<'/learn/[module]'>) {
  const { module } = await params;
  if (!IELTS_MODULES.includes(module as IELTSModule)) notFound();
  const current = module as IELTSModule;

  const userId = await requireUserId();
  const progress = await listLessonProgress(userId);
  const done = new Set(progress.map((p) => p.lessonId));

  const lessons = isAvailable(current) ? lessonsForModule(current) : [];
  const written = lessons.filter((l) => l.stages).length;
  const complete = lessons.filter((l) => done.has(l.id)).length;

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Learn"
        title={`${MODULE_LABEL[current]} technique`}
        description={
          isAvailable(current)
            ? `${complete} of ${written} written lessons finished. Each one ends by sending you to practise what it just taught.`
            : undefined
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
        GROUP_ORDER.map((group) => {
          const inGroup = lessons.filter((l) => l.group === group);
          if (!inGroup.length) return null;

          return (
            <section key={group} className="space-y-3">
              <SectionHeader as="h2">{GROUP_TITLE[group]}</SectionHeader>
              <ul className="divide-y divide-border border-y border-border">
                {inGroup.map((lesson) => {
                  const finished = done.has(lesson.id);
                  const unwritten = !lesson.stages;

                  const row = (
                    <div className="flex items-start gap-3 py-3.5">
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
                      <span className="shrink-0 font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase tabular-nums">
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
                          className="block transition-colors hover:bg-secondary/40"
                        >
                          {row}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
