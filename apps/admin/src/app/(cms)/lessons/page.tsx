import Link from 'next/link';
import { listLessonsAdmin } from '@bandzen/db/queries';
import { GROUP_TITLE, type Lesson } from '@bandzen/db/schema';
import { Button } from '@bandzen/ui/components/button';
import {
  EmptyState,
  Eyebrow,
  PageHeader,
} from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';

export const metadata = { title: 'Lessons' };

function groupLessons(lessons: Lesson[]) {
  const byModuleGroup = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    const key = `${lesson.module}:${lesson.group}`;
    byModuleGroup.set(key, [...(byModuleGroup.get(key) ?? []), lesson]);
  }
  return byModuleGroup;
}

export default async function LessonsPage() {
  await requireAdminOrTeacher();
  const lessons = await listLessonsAdmin();
  const grouped = groupLessons(lessons);

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Lessons"
        description="Grouped by module, then by section. Order within a group follows the order index."
        action={
          <Button nativeButton={false} render={<Link href="/lessons/new" />}>
            New lesson
          </Button>
        }
      />

      {grouped.size === 0 ? (
        <EmptyState
          title="No lessons yet"
          description="Lessons are grouped by module and section. Add the first one to start a group."
          action={
            <Button nativeButton={false} render={<Link href="/lessons/new" />}>
              New lesson
            </Button>
          }
        />
      ) : (
        [...grouped.entries()].map(([key, group]) => {
          const [module, groupId] = key.split(':');
          return (
            <div key={key} className="space-y-3">
              <Eyebrow as="h2">
                {module} · {GROUP_TITLE[groupId as keyof typeof GROUP_TITLE]}
              </Eyebrow>
              <ul className="divide-y divide-border border-y border-border">
                {group.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div>
                      <Link
                        href={`/lessons/${lesson.id}`}
                        className="text-sm hover:underline"
                      >
                        {lesson.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {lesson.slug} · {lesson.minutes}m ·{' '}
                        {lesson.stages
                          ? `${lesson.stages.length} stage(s)`
                          : 'unwritten'}
                      </p>
                    </div>
                    <StatusBadge status={lesson.status} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}
