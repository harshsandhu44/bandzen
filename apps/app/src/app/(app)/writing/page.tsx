import { Button } from '@bandzen/ui/components/button';
import { requireUserId } from '@/lib/auth';
import { listWritingPrompts } from '@/lib/db/queries';
import { startWritingAttempt } from './actions';
import { taskRules } from './timing';

/**
 * Content is shared and immutable, but it lives in the database and there is
 * no database at build time — so render on demand rather than prerender.
 *
 * ponytail: this is a handful of rows per request. If the passage list grows
 * enough to matter, wrap the query in a cache rather than making the page
 * static, since the seed can change without a redeploy.
 */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Writing' };

export default async function WritingPage() {
  // Auth is checked at the resource, not in middleware — see proxy.ts.
  await requireUserId();
  const prompts = await listWritingPrompts();

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Writing
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">
          Practice tasks
        </h1>
      </header>

      {!prompts.length ? (
        <p className="text-sm text-muted-foreground">
          No prompts seeded yet. See{' '}
          <code className="font-mono">apps/app/README.md</code>.
        </p>
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
