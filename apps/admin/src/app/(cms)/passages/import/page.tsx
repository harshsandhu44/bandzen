import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { ImportForm } from './import-form';

export const metadata = { title: 'Import a passage' };

export default async function ImportPassagePage() {
  await requireAdminOrTeacher();

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Passages"
        title="Import a generated passage"
        description={
          <>
            Upload one reviewed JSON file from the offline generation pipeline (
            <code className="font-mono text-xs">
              apps/app/content/passages/*.json
            </code>
            ). It arrives as a draft &mdash; review it and publish from the
            passage&rsquo;s own page.
          </>
        }
      />
      <ImportForm />
    </div>
  );
}
