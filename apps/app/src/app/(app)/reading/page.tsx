import Link from 'next/link';
import { Button } from '@bandzen/ui/components/button';
import { EmptyState, PageHeader } from '@/components/app/primitives';
import { FilterBar } from '@/components/app/filter-bar';
import { requireUserId } from '@/lib/auth';
import { DIFFICULTY_RANGE, listPassages } from '@/lib/db/queries';
import { QUESTION_KIND_LABEL } from '@/lib/modules';
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

export const metadata = { title: 'Reading practice' };

const KIND_OPTIONS = [
  { value: '', label: 'All types' },
  ...Object.entries(QUESTION_KIND_LABEL).map(([value, label]) => ({
    value,
    label,
  })),
];

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

type Kind = keyof typeof QUESTION_KIND_LABEL;
type Difficulty = keyof typeof DIFFICULTY_RANGE;

export default async function ReadingPage({
  searchParams,
}: PageProps<'/reading'>) {
  // Auth is checked at the resource, not in middleware — see proxy.ts.
  await requireUserId();

  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) || undefined;

  // Unknown values are dropped rather than passed to the query.
  const rawKind = one(sp.kind);
  const kind =
    rawKind && rawKind in QUESTION_KIND_LABEL ? (rawKind as Kind) : undefined;

  const rawDifficulty = one(sp.difficulty);
  const difficulty =
    rawDifficulty && rawDifficulty in DIFFICULTY_RANGE
      ? (rawDifficulty as Difficulty)
      : undefined;

  // The dashboard's Continue link narrows to one passage rather than starting
  // an attempt, because creating a row from a plain link would be wrong.
  const passageId = one(sp.passage);

  const passages = await listPassages({ kind, difficulty, id: passageId });
  const params = { kind, difficulty };

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Reading"
        title="Practice passages"
        description={
          kind
            ? `Passages containing ${QUESTION_KIND_LABEL[kind]} questions. Each passage carries thirteen questions across several types.`
            : 'Each passage carries thirteen questions and is timed at exam pace.'
        }
      />

      {passageId ? (
        <p className="border-l-2 border-chrome py-2 pl-4 text-sm">
          Showing the passage from your study plan.{' '}
          <Link href="/reading" className="underline underline-offset-4">
            Show all passages
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <FilterBar
            legend="Question type"
            param="kind"
            options={KIND_OPTIONS}
            active={kind ?? ''}
            basePath="/reading"
            params={params}
          />
          <FilterBar
            legend="Difficulty"
            param="difficulty"
            options={DIFFICULTY_OPTIONS}
            active={difficulty ?? ''}
            basePath="/reading"
            params={params}
          />
        </div>
      )}

      {!passages.length ? (
        kind || difficulty ? (
          <EmptyState
            title="No passages match those filters"
            description="There are only a few passages seeded so far. Widen the filters, or practise a different question type."
            action={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/reading" />}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No passages seeded yet"
            description="Run pnpm content:generate, review the JSON it writes, then pnpm content:sql and pnpm db:seed."
          />
        )
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
