import Link from 'next/link';
import {
  listContentEvents,
  type ContentType,
} from '@bandzen/db/queries';
import type { ContentStatus } from '@bandzen/db/schema';
import { Eyebrow } from '@bandzen/ui/components/primitives';
import { PublishControls, type ActionState } from '@/components/publish-controls';
import { CompletenessPanel } from '@/components/editor-shell';
import { resolveEditorEmails } from '@/lib/editor-email';

const ACTION_VERB: Record<string, string> = {
  created: 'created',
  updated: 'edited',
  published: 'published',
  unpublished: 'unpublished',
  deleted: 'deleted',
};

function ago(date: Date) {
  const m = Math.round((Date.now() - date.getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/**
 * The editor's right rail: publish controls, a live "before publishing"
 * read-out, a link that opens the draft as a student sees it, and the audit
 * history for this item.
 */
export async function EditorRail({
  type,
  id,
  noun,
  status,
  issues,
  publishAction,
  unpublishAction,
  deleteAction,
}: {
  type: ContentType;
  id: string;
  noun: string;
  status: ContentStatus;
  issues?: string[];
  publishAction: (
    prev: ActionState,
    formData: FormData,
  ) => Promise<ActionState>;
  unpublishAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (
    prev: ActionState,
    formData: FormData,
  ) => Promise<ActionState>;
}) {
  const events = await listContentEvents(type, id, 12);
  const emails = await resolveEditorEmails(events.map((e) => e.actorId));

  const previewUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/preview/${type}/${id}`
    : null;

  return (
    <div className="space-y-5">
      <PublishControls
        noun={noun}
        id={id}
        status={status}
        publishAction={publishAction}
        unpublishAction={unpublishAction}
        deleteAction={deleteAction}
      />

      {issues ? <CompletenessPanel issues={issues} /> : null}

      {previewUrl ? (
        <Link
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex text-xs text-primary hover:underline"
        >
          Preview as student ↗
        </Link>
      ) : null}

      <div className="space-y-2">
        <Eyebrow>History</Eyebrow>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No changes recorded yet.
          </p>
        ) : (
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {events.map((e) => (
              <li key={e.id} className="tabular-nums">
                {ACTION_VERB[e.action] ?? e.action} ·{' '}
                {e.actorId
                  ? (emails.get(e.actorId) ?? e.actorId)
                  : 'unknown'}{' '}
                · {ago(e.createdAt)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
