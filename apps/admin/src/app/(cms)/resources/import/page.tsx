import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { ImportForm } from '../../import/form';
import { REGISTRY } from '../../import/registry';

export const metadata = { title: 'Import resources' };

export default async function ImportResourcesPage() {
  await requireAdminOrTeacher();
  const { noun, templates } = REGISTRY.resources;

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Resources"
        title="Import resources"
        description="Guides with their body paragraphs. They arrive as drafts — review each one and publish from its own page."
      />
      <ImportForm entity="resources" noun={noun} templates={templates} />
    </div>
  );
}
