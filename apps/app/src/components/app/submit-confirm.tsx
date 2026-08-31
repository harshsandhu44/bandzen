'use client';

import { useState } from 'react';
import { Button } from '@bandzen/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@bandzen/ui/components/dialog';

/**
 * Submit, with a chance to go back.
 *
 * Submitting is irreversible — the attempt is scored and cannot be reopened —
 * so it asks first, and it says what is unfinished rather than asking a bare
 * "are you sure?". A confirmation that carries no information is just a click.
 */
export function SubmitConfirm({
  action,
  attemptId,
  unanswered,
  total,
  unsaved,
  disabled,
  label = 'Submit',
}: {
  action: (formData: FormData) => void;
  attemptId: string;
  /** Omitted for writing, which has one continuous answer rather than many. */
  unanswered?: number;
  total?: number;
  unsaved: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" size="sm" disabled={disabled}>
            {label}
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit this attempt?</DialogTitle>
          <DialogDescription>
            {unsaved
              ? 'Some of your work has not saved yet. Submitting now may lose it — close this and wait for the save to finish.'
              : unanswered
                ? `${unanswered} of ${total} questions are unanswered. An unanswered question scores zero, and a guess costs nothing.`
                : 'You cannot reopen an attempt once it has been submitted.'}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline">
                Keep working
              </Button>
            }
          />
          <form action={action}>
            <input type="hidden" name="attemptId" value={attemptId} />
            <Button type="submit" variant={unsaved ? 'destructive' : 'default'}>
              Submit now
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
