import Link from 'next/link';
import { EXAMS } from '@bandzen/exams/registry';
import { Badge } from '@bandzen/ui/components/badge';
import { PageHeader, SectionHeader } from '@bandzen/ui/components/primitives';
import { requireContentRole } from '@/lib/auth';

export const metadata = { title: 'Task lab', robots: { index: false } };

/**
 * Staff-only index of every task type every exam declares, each opening in
 * the real exam shell with placeholder content. For checking renderers before
 * content for them exists; nothing here writes to the database.
 */
export default async function TaskLabIndexPage() {
  await requireContentRole();

  return (
    <div className="max-w-4xl space-y-12">
      <PageHeader
        eyebrow="Staff"
        title="Task lab"
        description="Every task type in every exam definition, running in the exam shell with sample content. Answers stay in this tab."
      />
      {EXAMS.map((exam) => (
        <section key={exam.key} className="space-y-4">
          <SectionHeader as="h2">
            {exam.name} · {exam.version} · {exam.scoreScale.label}{' '}
            {exam.scoreScale.min}–{exam.scoreScale.max}
          </SectionHeader>
          {exam.sections.map((section) => (
            <div key={section.key} className="space-y-2">
              <h3 className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
                {section.label}
              </h3>
              <ul className="divide-y divide-border border-y border-border">
                {exam.tasks
                  .filter((t) => t.section === section.key)
                  .map((task) => (
                    <li
                      key={task.key}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <Link
                        href={`/preview/tasks/${exam.key}/${task.key}`}
                        className="text-sm underline-offset-4 hover:underline"
                      >
                        {task.label}
                      </Link>
                      <span className="flex gap-1.5">
                        <Badge variant="secondary">{task.stimulus}</Badge>
                        <Badge variant="outline">{task.renderer}</Badge>
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
