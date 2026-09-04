import Link from 'next/link';
import { Panel } from '@/components/app/primitives';
import { TaskStatus } from '@/components/app/status';
import { MODULE_LABEL } from '@/lib/modules';
import { targetHref, type PlanTask } from '@/lib/study-plan';

/**
 * The rest of the plan, grouped by day.
 *
 * Days rather than a flat list, because the plan is a week you can look at,
 * not a backlog. Came from /plan when that page folded into the dashboard.
 */

const WEEKDAY = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  timeZone: 'UTC',
});
const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

export function ComingUp({
  plan,
  today,
  heading = 'Coming up',
}: {
  plan: readonly PlanTask[];
  today: string;
  heading?: string;
}) {
  const byDay = new Map<string, PlanTask[]>();
  for (const task of plan) {
    if (task.date <= today) continue;
    byDay.set(task.date, [...(byDay.get(task.date) ?? []), task]);
  }

  if (!byDay.size) return null;

  return (
    <Panel title={heading} headingId="upcoming-heading">
      <ol className="space-y-6">
        {[...byDay.entries()].map(([date, tasks]) => {
          const d = new Date(`${date}T00:00:00Z`);
          return (
            <li key={date} className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <div className="border-l-2 border-border pl-3 sm:border-l-0 sm:pl-0">
                <p className="text-sm font-medium">{WEEKDAY.format(d)}</p>
                <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase tabular-nums">
                  {DATE.format(d)}
                </p>
              </div>

              <ul className="divide-y divide-border border-y border-border">
                {tasks.map((task, i) => {
                  const href = targetHref(task);
                  return (
                    <li
                      key={`${date}-${i}`}
                      className="flex items-center gap-3 py-3"
                    >
                      <TaskStatus status="pending" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{task.label}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {MODULE_LABEL[task.skill]} · {task.minutes} min
                        </p>
                      </div>
                      {href ? (
                        <Link
                          href={href}
                          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                          Open
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
