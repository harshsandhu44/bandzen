import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { SectionHeader } from '@/components/app/primitives';
import { LessonBlockView } from '@/components/learning/lesson-blocks';
import { STAGE_TITLE } from '@/content/lesson-types';
import { getLesson, lessonsForModule } from '@/content/lessons';
import { requireUserId } from '@/lib/auth';
import { listLessonProgress } from '@/lib/db/queries';
import { MODULE_LABEL, QUESTION_KIND_LABEL } from '@/lib/modules';
import { completeLesson } from '../../actions';

export async function generateMetadata({
  params,
}: PageProps<'/learn/[module]/[lesson]'>) {
  const { lesson } = await params;
  return { title: (await getLesson(lesson))?.title ?? 'Lesson' };
}

export default async function LessonPage({
  params,
}: PageProps<'/learn/[module]/[lesson]'>) {
  const { module, lesson: lessonId } = await params;

  const lesson = await getLesson(lessonId);
  // An unwritten lesson has no page — the Learn list already says so, and a
  // blank page pretending otherwise is worse than a 404.
  if (!lesson?.stages || lesson.module !== module) notFound();

  const userId = await requireUserId();
  const progress = await listLessonProgress(userId);
  const finished = progress.some((p) => p.lessonId === lesson.id);

  // The next written lesson in the same module, for the end of the page.
  const siblings = (await lessonsForModule(lesson.module)).filter(
    (l) => l.stages,
  );
  const next = siblings[siblings.findIndex((l) => l.id === lesson.id) + 1];

  const practiceHref = lesson.questionKind
    ? `/reading?kind=${lesson.questionKind}`
    : lesson.module === 'writing'
      ? '/writing'
      : '/reading';

  return (
    <article className="max-w-3xl space-y-10">
      <header className="space-y-3">
        <Link
          href={`/learn/${lesson.module}`}
          className="inline-flex items-center gap-1.5 text-xs underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-3" aria-hidden />
          {MODULE_LABEL[lesson.module]}
        </Link>
        <h1 className="font-title text-title-lg">{lesson.title}</h1>
        <p className="max-w-prose text-sm text-muted-foreground text-pretty">
          {lesson.summary}
        </p>
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase tabular-nums">
          {lesson.minutes} min
          {lesson.questionKind
            ? ` · ${QUESTION_KIND_LABEL[lesson.questionKind]}`
            : ''}
        </p>
      </header>

      {lesson.stages.map((stage, i) => (
        <section key={stage.id} className="space-y-4">
          <div className="flex items-baseline gap-3 border-b border-border pb-2">
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {String(i + 1).padStart(2, '0')}
            </span>
            <SectionHeader as="h2">{STAGE_TITLE[stage.id]}</SectionHeader>
          </div>

          <div className="space-y-4">
            {stage.blocks.map((block, j) => (
              <LessonBlockView key={j} block={block} />
            ))}

            {/* The Practice stage is where the lesson hands over to the
                engine, so the action lives inside it rather than in a footer. */}
            {stage.id === 'practice' ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href={practiceHref} />}
              >
                Practise this
                <ArrowRight />
              </Button>
            ) : null}
          </div>
        </section>
      ))}

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
        {finished ? (
          <p className="inline-flex items-center gap-2 font-mono text-xs tracking-widest text-primary uppercase">
            <Check className="size-3.5" aria-hidden />
            Marked as read
          </p>
        ) : (
          <form action={completeLesson}>
            <input type="hidden" name="lessonId" value={lesson.id} />
            <Button type="submit">Mark as read</Button>
          </form>
        )}

        {next ? (
          <Link
            href={`/learn/${lesson.module}/${next.id}`}
            className="inline-flex items-center gap-1.5 text-xs underline-offset-4 hover:underline"
          >
            {next.title}
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        ) : null}
      </footer>
    </article>
  );
}
