import Link from 'next/link';
import { PageHeader, SectionHeader } from '@/components/app/primitives';
import { FilterBar } from '@/components/app/filter-bar';
import { LearnNav } from '@/components/learning/learn-nav';
import {
  CATEGORY_TITLE,
  listResources,
  RESOURCE_CATEGORIES,
  type ResourceCategory,
} from '@/content/resources';
import { requireUserId } from '@/lib/auth';
import { cn } from '@bandzen/ui/lib/utils';

export const metadata = { title: 'Guides' };

const OPTIONS = [
  { value: '', label: 'All' },
  ...RESOURCE_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_TITLE[c] })),
];

export default async function ResourcesPage({
  searchParams,
}: PageProps<'/resources'>) {
  await requireUserId();

  const sp = await searchParams;
  const raw = Array.isArray(sp.category) ? sp.category[0] : sp.category;
  const category =
    raw && RESOURCE_CATEGORIES.includes(raw as ResourceCategory)
      ? (raw as ResourceCategory)
      : undefined;

  const allResources = await listResources();
  const shown = category
    ? allResources.filter((r) => r.category === category)
    : allResources;

  // Grouped by category, in the declared order, so the page reads as an index
  // rather than a feed.
  const groups = RESOURCE_CATEGORIES.map((c) => ({
    category: c,
    items: shown.filter((r) => r.category === c),
  })).filter((g) => g.items.length);

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Learn"
        title="Guides"
        description="Short pieces you can read between practice sessions. Each one ends by pointing at something to do."
      />

      <LearnNav current="guides" />

      <FilterBar
        legend="Category"
        param="category"
        options={OPTIONS}
        active={category ?? ''}
        basePath="/resources"
        params={{}}
      />

      {groups.map((group) => (
        <section key={group.category} className="space-y-3">
          <SectionHeader as="h2">
            {CATEGORY_TITLE[group.category]}
          </SectionHeader>

          <ul className="divide-y divide-border border-y border-border">
            {group.items.map((resource) => {
              const unwritten = !resource.body;
              const row = (
                <div className="flex items-start justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        unwritten && 'text-muted-foreground',
                      )}
                    >
                      {resource.title}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
                      {resource.summary}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {unwritten
                      ? 'Not written yet'
                      : `${resource.minutes} min · ${resource.level}`}
                  </span>
                </div>
              );

              return (
                <li key={resource.id}>
                  {unwritten ? (
                    row
                  ) : (
                    <Link
                      href={`/resources/${resource.id}`}
                      className="block transition-colors hover:bg-secondary/40"
                    >
                      {row}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
