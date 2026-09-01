import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { ImportForm } from '../../import/form';
import { REGISTRY } from '../../import/registry';

export const metadata = { title: 'Import passages' };

export default async function ImportPassagesPage() {
  await requireAdminOrTeacher();
  const { noun, templates } = REGISTRY.passages;

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Passages"
        title="Import passages"
        description={
          <>
            One reviewed JSON file from the offline generation pipeline (
            <code className="font-mono text-xs">
              apps/app/content/passages/*.json
            </code>
            ), or an array of them. They arrive as drafts &mdash; review each
            one and publish from its own page.
          </>
        }
      />
      <ImportForm entity="passages" noun={noun} templates={templates} />
    </div>
  );
}
