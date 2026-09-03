import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { ImportForm } from '../../import/form';
import { REGISTRY } from '../../import/registry';

export const metadata = { title: 'Import speaking tests' };

export default async function ImportSpeakingPage() {
  await requireAdminOrTeacher();
  const { noun, templates } = REGISTRY.speaking;

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Speaking"
        title="Import speaking tests"
        description={
          <>
            One reviewed JSON file from the offline pipeline (
            <code className="font-mono text-xs">
              apps/app/content/speaking/*.json
            </code>
            ), or an array of them — the three parts flattened to one ordered{' '}
            <code className="font-mono text-xs">prompts</code> array. A prompt
            without an <code className="font-mono text-xs">audioUrl</code> gets
            its examiner voice synthesized when you open the draft. They arrive
            as drafts — review and publish from each test&apos;s own page.
          </>
        }
      />
      <ImportForm entity="speaking" noun={noun} templates={templates} />
    </div>
  );
}
