import Link from 'next/link';
import { ADMIN_PAGE_SIZE, listExamTasksAdmin } from '@bandzen/db/queries';
import { examLabel, getTask } from '@bandzen/exams/registry';
import { Button } from '@bandzen/ui/components/button';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { ContentList } from '@/components/content-list';
import {
  ALL_TASKS_FILTER,
  EXAM_FILTER,
  asExam,
  taskFilter,
} from '@/lib/exam-filters';
import {
  bulkDeleteExamTasksAction,
  bulkPublishExamTasksAction,
  bulkUnpublishExamTasksAction,
} from './actions';

export const metadata = { title: 'Exam tasks' };

export default async function ExamTasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    exam?: string;
    task?: string;
  }>;
}) {
  await requireAdminOrTeacher();
  const { q, status, page: pageParam, exam, task } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const examKey = asExam(exam);
  const rows = await listExamTasksAdmin({
    q,
    exam: examKey,
    task,
    status: status === 'draft' || status === 'published' ? status : undefined,
    limit: ADMIN_PAGE_SIZE + 1,
    offset: (page - 1) * ADMIN_PAGE_SIZE,
  });
  const hasMore = rows.length > ADMIN_PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, ADMIN_PAGE_SIZE) : rows;

  const items = pageRows.map((r) => ({
    id: r.id,
    href: `/tasks/${r.id}`,
    title: r.title,
    meta: `${r.slug} · ${examLabel(r.examKey)} ${r.examVersion} · ${getTask(r.examKey, r.taskType)?.label ?? r.taskType}`,
    status: r.status,
  }));

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Exam tasks"
        description="PTE Academic, TOEFL iBT and Duolingo English Test items, one task type each. Students only ever see published ones, and never their answer keys."
        action={
          <Button nativeButton={false} render={<Link href="/tasks/import" />}>
            Import JSON
          </Button>
        }
      />

      <ContentList
        items={items}
        filters={[
          EXAM_FILTER,
          examKey ? taskFilter(examKey) : ALL_TASKS_FILTER,
        ]}
        page={page}
        hasMore={hasMore}
        emptyTitle="No exam tasks yet"
        emptyDescription="Import a reviewed JSON file of task items for any exam."
        emptyAction={
          <Button nativeButton={false} render={<Link href="/tasks/import" />}>
            Import JSON
          </Button>
        }
        bulk={{
          noun: 'exam task',
          publish: bulkPublishExamTasksAction,
          unpublish: bulkUnpublishExamTasksAction,
          remove: bulkDeleteExamTasksAction,
        }}
      />
    </div>
  );
}
