import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { ImportForm } from '../../import/form';
import { REGISTRY } from '../../import/registry';

export const metadata = { title: 'Import writing prompts' };

export default async function ImportWritingPromptsPage() {
  await requireAdminOrTeacher();
  const { noun, templates } = REGISTRY['writing-prompts'];

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Writing prompts"
        title="Import writing prompts"
        description={
          <>
            An array of prompts, or a single one &mdash;{' '}
            <code className="font-mono text-xs">
              apps/app/content/prompts.json
            </code>{' '}
            imports as it stands. They arrive as drafts.
          </>
        }
      />
      <ImportForm entity="writing-prompts" noun={noun} templates={templates} />
    </div>
  );
}
