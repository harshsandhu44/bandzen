import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { ImportForm } from '../../import/form';
import { REGISTRY } from '../../import/registry';

export const metadata = { title: 'Import exam tasks' };

export default async function ImportExamTasksPage() {
  await requireAdminOrTeacher();
  const { noun, templates } = REGISTRY.tasks;

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Exam tasks"
        title="Import exam tasks"
        description="One task item, or an array of them, for any exam. Each is checked against its exam's definition — the task type, the format version, and the content its renderer and marking need — and arrives as a draft."
      />
      <ImportForm entity="tasks" noun={noun} templates={templates} />
    </div>
  );
}
