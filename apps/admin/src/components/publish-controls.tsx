'use client';

import { useActionState } from 'react';
import { Button } from '@bandzen/ui/components/button';
import type { ContentStatus } from '@bandzen/db/schema';

export type ActionState = { error: string | null };
const initial: ActionState = { error: null };

/**
 * Shared publish/unpublish/delete controls for a content item's edit page —
 * used by passages and writing prompts alike, so the "surface the specific
 * PublishValidationError/ContentInUseError instead of a generic failure"
 * behavior only has to be built once.
 */
export function PublishControls({
  id,
  status,
  publishAction,
  unpublishAction,
  deleteAction,
}: {
  id: string;
  status: ContentStatus;
  publishAction: (
    prev: ActionState,
    formData: FormData,
  ) => Promise<ActionState>;
  unpublishAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [publishState, publish, publishing] = useActionState(
    publishAction,
    initial,
  );
  const [deleteState, del, deleting] = useActionState(deleteAction, initial);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'draft' ? (
        <form action={publish}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" disabled={publishing}>
            {publishing ? 'Publishing…' : 'Publish'}
          </Button>
        </form>
      ) : (
        <form action={unpublishAction}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="outline">
            Unpublish
          </Button>
        </form>
      )}

      <form action={del}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="destructive" disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </form>

      {publishState.error ? (
        <p role="alert" className="w-full font-mono text-xs text-destructive">
          {publishState.error}
        </p>
      ) : null}
      {deleteState.error ? (
        <p role="alert" className="w-full font-mono text-xs text-destructive">
          {deleteState.error}
        </p>
      ) : null}
    </div>
  );
}
