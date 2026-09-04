'use client';

import { useActionState } from 'react';
import { Button } from '@bandzen/ui/components/button';
import { ConfirmDialog } from '@bandzen/ui/components/confirm-dialog';
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
  noun = 'item',
  publishAction,
  unpublishAction,
  deleteAction,
}: {
  id: string;
  status: ContentStatus;
  /** Singular, lower case: "Delete this passage?" */
  noun?: string;
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

      <ConfirmDialog
        trigger={
          <Button type="button" variant="destructive" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        }
        title={`Delete this ${noun}?`}
        description={
          status === 'published'
            ? 'It is published and students may be using it. Unpublish it first unless you are sure.'
            : "This can't be undone."
        }
        confirmLabel="Delete"
        pending={deleting}
        onConfirm={() => {
          const fd = new FormData();
          fd.set('id', id);
          del(fd);
        }}
      />

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
