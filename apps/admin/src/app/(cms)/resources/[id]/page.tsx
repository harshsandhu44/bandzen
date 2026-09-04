import { notFound } from 'next/navigation';
import {
  getResourceById,
  checkResourceCompleteness,
} from '@bandzen/db/queries';
import { PageHeader } from '@bandzen/ui/components/primitives';
import { requireAdminOrTeacher } from '@/lib/auth';
import { StatusBadge } from '@/components/status-badge';
import { EditorRail } from '@/components/editor-rail';
import { EditorShell } from '@/components/editor-shell';
import { resolveEditorEmail } from '@/lib/editor-email';
import {
  publishResourceAction,
  unpublishResourceAction,
  deleteResourceAction,
} from '../actions';
import { ResourceEditor } from './resource-editor';
import type { ResourceFormValues } from './schema';

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrTeacher();
  const { id } = await params;
  const resource = await getResourceById(id);
  if (!resource) notFound();

  const [issues, editor] = await Promise.all([
    checkResourceCompleteness(id),
    resolveEditorEmail(resource.updatedBy),
  ]);

  const defaults: ResourceFormValues = {
    title: resource.title,
    summary: resource.summary,
    category: resource.category,
    level: resource.level,
    minutes: resource.minutes,
    module: resource.module ?? '',
    questionKind: resource.questionKind ?? '',
    bodyText: (resource.body ?? []).join('\n\n'),
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Resources"
        title={resource.title}
        backHref="/resources"
        backLabel="Resources"
        description={
          <span className="font-mono text-xs tabular-nums">
            {resource.slug} · edited by {editor} ·{' '}
            {resource.updatedAt.toLocaleDateString()}
          </span>
        }
        action={<StatusBadge status={resource.status} />}
      />

      <EditorShell
        rail={
          <EditorRail
            type="resource"
            id={resource.id}
            noun="resource"
            status={resource.status}
            issues={issues}
            publishAction={publishResourceAction}
            unpublishAction={unpublishResourceAction}
            deleteAction={deleteResourceAction}
          />
        }
      >
        <ResourceEditor id={resource.id} defaults={defaults} />
      </EditorShell>
    </div>
  );
}
