import { BookOpen, PenLine } from 'lucide-react';
import type { PlanTask } from '@/lib/study-plan';
import type { Skill } from '@/lib/db/schema';

const ICON: Record<Skill, typeof BookOpen> = {
  reading: BookOpen,
  writing: PenLine,
};

/**
 * Renders a plan. Server component — the plan is derived, never interactive,
 * and recomputed from the latest results on every request.
 */
export function StudyPlan({ tasks }: { tasks: PlanTask[] }) {
  if (!tasks.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No plan to show — your test date has passed. Set a new one from the
        diagnostic page.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-border border-y border-border">
      {tasks.map((task) => {
        const Icon = ICON[task.skill];
        return (
          <li key={task.day} className="flex items-baseline gap-4 py-3">
            <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {task.date.slice(5)}
            </span>
            <Icon
              className="size-3.5 shrink-0 self-center text-muted-foreground"
              aria-hidden
            />
            <span className="flex-1 text-sm">{task.label}</span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {task.minutes}m
            </span>
          </li>
        );
      })}
    </ol>
  );
}
