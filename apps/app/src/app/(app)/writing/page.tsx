import Link from 'next/link';
import { Button } from '@bandzen/ui/components/button';
import { EmptyState, PageHeader } from '@/components/app/primitives';
import { FilterBar } from '@/components/app/filter-bar';
import { requireUserId } from '@/lib/auth';
import { getProfile, listWritingPrompts } from '@/lib/db/queries';
import { startWritingAttempt } from './actions';
import { taskRules } from './timing';

/**
 * Content is shared and immutable, but it lives in the database and there is
 * no database at build time — so render on demand rather than prerender.
 *
 * ponytail: this is a handful of rows per request. If the prompt list grows
 * enough to matter, wrap the query in a cache rather than making the page
 * static, since the seed can change without a redeploy.
 */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Writing practice' };

const TASK_OPTIONS = [
  { value: '', label: 'All tasks' },
  { value: '1', label: 'Task 1' },
  { value: '2', label: 'Task 2' },
];

/** How the same task number is described for each exam. */
const TASK_ONE_LABEL: Record<string, string> = {
  academic: 'Academic Task 1 — describe a chart, table or diagram',
  general: 'General Training Task 1 — write a letter',
};

export default async function WritingPage({
  searchParams,
}: PageProps<'/writing'>) {
  // Auth is checked at the resource, not in middleware — see proxy.ts.
  const userId = await requireUserId();

  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) || undefined;

  const rawTask = one(sp.task);
  const task = rawTask === '1' || rawTask === '2' ? Number(rawTask) : undefined;
  const promptId = one(sp.prompt);

  const [profile, prompts] = await Promise.all([
    getProfile(userId),
    listWritingPrompts({ task, id: promptId }),
  ]);

  const examType = profile?.examType ?? 'academic';

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Writing"
        title="Practice tasks"
        description="Every submission is graded against the four IELTS Writing criteria and returns an estimated band with annotated feedback."
      />

      {promptId ? (
        <p className="border-l-2 border-chrome py-2 pl-4 text-sm">
          Showing the task from your study plan.{' '}
          <Link href="/writing" className="underline underline-offset-4">
            Show all tasks
          </Link>
        </p>
      ) : (
        <FilterBar
          legend="Task"
          param="task"
          options={TASK_OPTIONS}
          active={rawTask ?? ''}
          basePath="/writing"
          params={{}}
        />
      )}

      {/* Task 1 differs by exam, and we know which exam they are sitting. */}
      {task === 1 || !task ? (
        <p className="text-xs text-muted-foreground">
          {TASK_ONE_LABEL[examType]}. Task 2 is the same essay for both exams
          and carries twice the marks.
        </p>
      ) : null}

      {!prompts.length ? (
        task ? (
          <EmptyState
            title={`No Task ${task} prompts seeded yet`}
            description="Only Task 2 prompts are written so far. They are hand-authored in content/prompts.json rather than generated."
            action={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/writing" />}
              >
                Show all tasks
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No prompts seeded yet"
            description="See apps/app/README.md for the content pipeline: content:generate, review, content:sql, db:seed."
          />
        )
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {prompts.map((p) => {
            const { minutes, minWords } = taskRules(p.task);
            return (
              <li
                key={p.id}
                className="flex items-start justify-between gap-4 py-4"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                    Task {p.task} · {minutes} min · {minWords}+ words
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm">{p.promptText}</p>
                </div>
                <form action={startWritingAttempt}>
                  <input type="hidden" name="promptId" value={p.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Start
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
