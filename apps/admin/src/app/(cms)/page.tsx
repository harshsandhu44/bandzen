import Link from 'next/link';
import { clerkClient } from '@clerk/nextjs/server';
import { Button } from '@bandzen/ui/components/button';
import {
  contentCounts,
  listRecentlyEdited,
  type ContentType,
} from '@bandzen/db/queries';
import {
  Eyebrow,
  EmptyState,
  Metric,
  PageHeader,
  SectionHeader,
} from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';

export const metadata = { title: 'Overview' };

const SECTIONS: { type: ContentType; label: string; href: string }[] = [
  { type: 'passage', label: 'Passages', href: '/passages' },
  { type: 'listening-track', label: 'Listening', href: '/listening' },
  { type: 'speaking-test', label: 'Speaking', href: '/speaking' },
  {
    type: 'writing-prompt',
    label: 'Writing prompts',
    href: '/writing-prompts',
  },
  { type: 'lesson', label: 'Lessons', href: '/lessons' },
  { type: 'resource', label: 'Resources', href: '/resources' },
];

const EDIT_HREF: Record<ContentType, (id: string) => string> = {
  passage: (id) => `/passages/${id}`,
  'listening-track': (id) => `/listening/${id}`,
  'speaking-test': (id) => `/speaking/${id}`,
  'writing-prompt': (id) => `/writing-prompts/${id}`,
  lesson: (id) => `/lessons/${id}`,
  resource: (id) => `/resources/${id}`,
};

const TYPE_LABEL: Record<ContentType, string> = {
  passage: 'Passage',
  'listening-track': 'Track',
  'speaking-test': 'Speaking',
  'writing-prompt': 'Prompt',
  lesson: 'Lesson',
  resource: 'Resource',
};

/** Coarse on purpose — this is an "is anything stale?" signal, not a timestamp. */
function ago(date: Date) {
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function OverviewPage() {
  await requireAdminOrTeacher();
  const [counts, recent] = await Promise.all([
    contentCounts(),
    listRecentlyEdited(10),
  ]);

  // One Clerk call for the whole feed: `updatedBy` is a raw userId, and rows
  // backfilled before the CMS existed have none.
  const editorIds = [
    ...new Set(
      recent.map((r) => r.updatedBy).filter((id): id is string => !!id),
    ),
  ];
  const emailById = new Map<string, string>();
  if (editorIds.length > 0) {
    const { data } = await (
      await clerkClient()
    ).users.getUserList({ userId: editorIds });
    for (const user of data) {
      emailById.set(user.id, user.primaryEmailAddress?.emailAddress ?? user.id);
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Overview"
        description="What exists, and what has changed lately. A draft is invisible to students until it is published."
      />

      {/* Cards became Metrics. A count is instrumentation, so it belongs in the
          mono scale with a tracked-out label above it — the same treatment a
          band score gets in apps/app. Four bordered boxes around four numbers
          added a frame and no information. */}
      <div className="grid gap-6 border-y border-border py-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {SECTIONS.map((section) => {
          const { draft, published, total } = counts[section.type];
          return (
            <Link
              key={section.type}
              href={section.href}
              className="transition-opacity hover:opacity-70"
            >
              <Metric
                label={section.label}
                value={total}
                hint={
                  draft > 0 ? (
                    <>
                      {published} published ·{' '}
                      <span className="text-foreground">{draft} draft</span>
                    </>
                  ) : (
                    `${published} published`
                  )
                }
              />
            </Link>
          );
        })}
      </div>

      <section className="space-y-3">
        <SectionHeader>Recently edited</SectionHeader>
        {recent.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            description="Once you create a passage, prompt, lesson or resource it will show up here with who touched it last."
            action={
              <Button
                nativeButton={false}
                render={<Link href="/passages/new" />}
              >
                New passage
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {recent.map((item) => (
              <li
                key={`${item.type}:${item.id}`}
                className="flex items-center gap-3 py-3"
              >
                <Eyebrow as="span" className="w-16 shrink-0">
                  {TYPE_LABEL[item.type]}
                </Eyebrow>
                <Link
                  href={EDIT_HREF[item.type](item.id)}
                  className="flex-1 truncate text-sm hover:underline"
                >
                  {item.label}
                </Link>
                <StatusBadge status={item.status} />
                <span className="hidden w-44 shrink-0 truncate text-right font-mono text-xs text-muted-foreground tabular-nums sm:block">
                  {ago(item.updatedAt)} ·{' '}
                  {item.updatedBy
                    ? (emailById.get(item.updatedBy) ?? item.updatedBy)
                    : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
