import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { ImportForm } from '../../import/form';
import { REGISTRY } from '../../import/registry';

export const metadata = { title: 'Import lessons' };

export default async function ImportLessonsPage() {
  await requireAdminOrTeacher();
  const { noun, templates } = REGISTRY.lessons;

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Lessons"
        title="Import lessons"
        description="Whole lessons, stages and blocks included — the one way to avoid building six stages by hand. They arrive as drafts."
      />
      <ImportForm entity="lessons" noun={noun} templates={templates} />
    </div>
  );
}
