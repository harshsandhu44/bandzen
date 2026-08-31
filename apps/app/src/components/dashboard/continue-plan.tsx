import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { MODULE_LABEL } from '@/lib/modules';
import type { PlanTaskState } from '@/lib/study-plan';

/**
 * The one thing the dashboard is for.
 *
 * Deliberately the loudest block on the page — an instrument panel rather than
 * a card: a full-bleed ruled surface, the task set in the same measured type as
 * a band figure, and a single action. Analytics sit below it because a number
 * the candidate cannot act on is not the reason they opened the app.
 */
export function ContinuePlan({ task }: { task: PlanTaskState }) {
  const href = targetHref(task);

  return (
    <section
      aria-labelledby="continue-heading"
      className="relative border border-foreground/15 bg-secondary/40"
    >
      {/* Tick rule: the same measured idiom as the band scale, not decoration. */}
      <div
        aria-hidden
        className="h-1.5 w-full border-b border-foreground/15"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to right, var(--border) 0 1px, transparent 1px 12px)',
        }}
      />

      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div className="space-y-2">
          <p
            id="continue-heading"
            className="font-mono text-xs tracking-widest text-muted-foreground uppercase"
          >
            {task.status === 'active'
              ? 'Pick up where you left off'
              : 'Continue your plan'}
          </p>
          <p className="text-xl font-medium tracking-tight text-balance sm:text-2xl">
            {task.label}
          </p>
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase tabular-nums">
            {MODULE_LABEL[task.skill]} · {task.minutes} min
          </p>
        </div>

        {href ? (
          <Button
            size="lg"
            nativeButton={false}
            render={<Link href={href} />}
            className="shrink-0"
          >
            {task.status === 'active' ? 'Resume' : 'Continue'}
            <ArrowRight />
          </Button>
        ) : (
          <p className="max-w-56 text-xs text-muted-foreground">
            No material is seeded for this task yet, so there is nothing to
            open.
          </p>
        )}
      </div>
    </section>
  );
}

/** Where a task actually opens. Null means we have nothing real to link to. */
export function targetHref(task: PlanTaskState): string | null {
  switch (task.target?.kind) {
    case 'reading':
      return `/reading?passage=${task.target.passageId}`;
    case 'writing':
      return `/writing?prompt=${task.target.promptId}`;
    case 'lesson':
      // Lesson routes are module-scoped, and the task's skill is that module.
      return `/learn/${task.skill}/${task.target.lessonId}`;
    default:
      return null;
  }
}
