import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { ImportForm } from '../../import/form';
import { REGISTRY } from '../../import/registry';

export const metadata = { title: 'Import listening tracks' };

export default async function ImportListeningPage() {
  await requireAdminOrTeacher();
  const { noun, templates } = REGISTRY.listening;

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Listening"
        title="Import listening tracks"
        description={
          <>
            One reviewed JSON file from the offline generation pipeline (
            <code className="font-mono text-xs">
              apps/app/content/listening/*.json
            </code>
            ), or an array of them. Each row needs a{' '}
            <code className="font-mono text-xs">transcript</code> or an{' '}
            <code className="font-mono text-xs">audioUrl</code> (or both); the
            other is generated when you open the draft. They arrive as drafts
            &mdash; review each one and publish from its own page.
          </>
        }
      />
      <ImportForm entity="listening" noun={noun} templates={templates} />
    </div>
  );
}
