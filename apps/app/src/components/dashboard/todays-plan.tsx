import Link from 'next/link';
import { Panel } from '@/components/app/primitives';
import { TaskStatus } from '@/components/app/status';
import { MODULE_LABEL } from '@/lib/modules';
import { targetHref, type PlanProgress } from '@/lib/study-plan';

/**
 * Today's tasks and how much of the day's goal they account for.
 *
 * The minutes bar counts scheduled minutes for tasks that are demonstrably
 * finished — an attempt submitted today, a lesson marked read. It is not a
 * timer: we do not watch how long anyone sits on a page, so claiming a
 * "minutes studied" figure that included reading time would be invented.
 */
export function TodaysPlan({ progress }: { progress: PlanProgress }) {
  const { tasks, minutesDone, minutesGoal } = progress;
  const pct = minutesGoal
    ? Math.min(100, (minutesDone / minutesGoal) * 100)
    : 0;

  return (
    <Panel
      headingId="today-heading"
      title="Today"
      action={
        <p className="font-metric text-metric-sm text-muted-foreground">
          {minutesDone} / {minutesGoal} min
        </p>
      }
    >
      <div
        role="progressbar"
        aria-valuenow={minutesDone}
        aria-valuemin={0}
        aria-valuemax={minutesGoal}
        aria-label="Minutes completed today"
        className="mb-3 h-1 w-full bg-border"
      >
        <div className="h-1 bg-primary" style={{ width: `${pct}%` }} />
      </div>

      <ul className="-mb-2.5 divide-y divide-border border-t border-border">
        {tasks.map((task, i) => {
          const href = targetHref(task);
          return (
            <li
              key={`${task.date}-${i}`}
              className="flex items-center gap-3 py-3"
            >
              <TaskStatus status={task.status} />

              <div className="min-w-0 flex-1">
                <p
                  className={
                    task.status === 'completed'
                      ? 'text-sm text-muted-foreground line-through'
                      : 'text-sm'
                  }
                >
                  {task.label}
                </p>
                <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase tabular-nums">
                  {MODULE_LABEL[task.skill]} · {task.minutes} min
                </p>
              </div>

              {task.status === 'completed' ? (
                <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
                  Done
                </span>
              ) : href ? (
                <Link
                  href={href}
                  className="text-xs underline-offset-4 hover:underline"
                >
                  {task.status === 'active' ? 'Resume' : 'Start'}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
