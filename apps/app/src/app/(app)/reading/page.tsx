import { Button } from '@bandzen/ui/components/button';
import { requireUserId } from '@/lib/auth';
import { listPassages } from '@/lib/db/queries';
import { startReadingAttempt } from './actions';

/**
 * Content is shared and immutable, but it lives in the database and there is
 * no database at build time — so render on demand rather than prerender.
 *
 * ponytail: this is a handful of rows per request. If the passage list grows
 * enough to matter, wrap the query in a cache rather than making the page
 * static, since the seed can change without a redeploy.
 */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Reading' };

export default async function ReadingPage() {
  // Auth is checked at the resource, not in middleware — see proxy.ts.
  await requireUserId();
  const passages = await listPassages();

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Reading
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">
          Practice passages
        </h1>
      </header>

      {!passages.length ? (
        <p className="text-sm text-muted-foreground">
          No passages seeded yet. Run{' '}
          <code className="font-mono">pnpm content:generate</code>, review the
          JSON, then <code className="font-mono">pnpm db:seed</code>.
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {passages.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-4 py-4"
            >
              <div>
                <h2 className="font-medium">{p.title}</h2>
                <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  {p.topic} · Level {p.difficulty}
                </p>
              </div>
              <form action={startReadingAttempt}>
                <input type="hidden" name="passageId" value={p.id} />
                <Button type="submit" variant="outline" size="sm">
                  Start
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
