import Link from 'next/link';
import { Badge } from '@bandzen/ui/components/badge';
import { Button } from '@bandzen/ui/components/button';
import { EmptyState, PageHeader, Panel } from '@/components/app/primitives';
import { FilterBar } from '@/components/app/filter-bar';
import { LockedPracticeRow, QuotaMeter } from '@/components/billing/pro';
import { capture } from '@/lib/analytics';
import { requireUserId } from '@/lib/auth';
import { DIFFICULTY_RANGE, listTracks, practiceAllowance } from '@/lib/db/queries';
import { QUESTION_KIND_LABEL } from '@/lib/modules';
import { startListeningAttempt } from './actions';

export const metadata = { title: 'Listening practice' };

/** The question kinds that actually appear on a listening track — T/F/NG and
 *  matching_headings are reading-specific, so they're left out of this filter. */
const LISTENING_KINDS = [
  'multiple_choice',
  'sentence_completion',
  'matching',
] as const;

const KIND_OPTIONS = [
  { value: '', label: 'All types' },
  ...LISTENING_KINDS.map((value) => ({
    value,
    label: QUESTION_KIND_LABEL[value],
  })),
];

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

type Kind = (typeof LISTENING_KINDS)[number];
type Difficulty = keyof typeof DIFFICULTY_RANGE;

export default async function ListeningPage({
  searchParams,
}: PageProps<'/listening'>) {
  // Auth is checked at the resource, not in middleware — see proxy.ts.
  const userId = await requireUserId();

  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v) || undefined;

  // Unknown values are dropped rather than passed to the query.
  const rawKind = one(sp.kind);
  const kind = (LISTENING_KINDS as readonly string[]).includes(rawKind ?? '')
    ? (rawKind as Kind)
    : undefined;

  const rawDifficulty = one(sp.difficulty);
  const difficulty =
    rawDifficulty && rawDifficulty in DIFFICULTY_RANGE
      ? (rawDifficulty as Difficulty)
      : undefined;

  const trackId = one(sp.track);

  const [tracks, quota] = await Promise.all([
    listTracks({ kind, difficulty, id: trackId }),
    practiceAllowance(userId, 'listening'),
  ]);
  const params = { kind, difficulty };

  if (!quota.unlimited && quota.remaining === 0) {
    await capture(userId, 'quota_exhausted', { surface: 'listening' });
  }

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Listening"
        title="Practice tracks"
        description={
          kind
            ? `Tracks containing ${QUESTION_KIND_LABEL[kind]} questions. Audio plays once, exactly as it does in the exam.`
            : 'Each track plays once, exactly as it does in the exam, with a batch of questions to answer as you listen.'
        }
      />

      {trackId ? (
        <p className="border-l-2 border-chrome py-2 pl-4 text-sm">
          Showing the track from your study plan.{' '}
          <Link href="/listening" className="underline underline-offset-4">
            Show all tracks
          </Link>
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <FilterBar
            legend="Question type"
            param="kind"
            options={KIND_OPTIONS}
            active={kind ?? ''}
            basePath="/listening"
            params={params}
          />
          <FilterBar
            legend="Difficulty"
            param="difficulty"
            options={DIFFICULTY_OPTIONS}
            active={difficulty ?? ''}
            basePath="/listening"
            params={params}
          />
        </div>
      )}

      <QuotaMeter
        id="listening-quota"
        allowance={quota}
        noun="listening tests"
        period=""
        source="listening_wall"
      />

      {!tracks.length ? (
        kind || difficulty ? (
          <EmptyState
            title="No tracks match those filters"
            description="There are only a few tracks seeded so far. Widen the filters, or practise a different question type."
            action={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href="/listening" />}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="No tracks seeded yet"
            description="Run pnpm content:listening:generate, review the JSON it writes, then pnpm content:listening:audio, pnpm content:listening:sql, and pnpm db:seed."
          />
        )
      ) : (
        <Panel
          title="Tracks"
          action={
            <span className="font-metric text-metric-sm text-muted-foreground">
              {tracks.length}
            </span>
          }
        >
          <ul className="-my-3 divide-y divide-border">
            {tracks.map((t, i) => {
              const inner = (
                <div className="min-w-0">
                  <h2 className="font-medium">{t.title}</h2>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">Level {t.difficulty}</Badge>
                    <span className="truncate">{t.topic}</span>
                  </p>
                </div>
              );

              if (!quota.unlimited && i >= quota.remaining) {
                return (
                  <LockedPracticeRow key={t.id} source="listening_wall">
                    {inner}
                  </LockedPracticeRow>
                );
              }

              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  {inner}
                  <form action={startListeningAttempt}>
                    <input type="hidden" name="trackId" value={t.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Start
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </div>
  );
}
