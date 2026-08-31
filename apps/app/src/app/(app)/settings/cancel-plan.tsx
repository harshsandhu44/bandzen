'use client';

import { useState, useTransition } from 'react';
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
import { cancelPro } from '@/app/(app)/upgrade/actions';

/**
 * Cancelling, in one press and one confirmation.
 *
 * The dialog follows `submit-confirm.tsx`: it says what is actually at stake
 * rather than "are you sure". Here that is the date access runs to and what
 * Free looks like afterwards — cancelling never takes away a period already
 * paid for, and someone deciding deserves to know that before they decide.
 *
 * Easy cancellation is also what makes the purchase feel safe in the first
 * place. It converts more than it churns.
 */
export function CancelPlan({
  until,
  essaysPerWeek,
  coachPerWeek,
}: {
  until: string;
  essaysPerWeek: number;
  coachPerWeek: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            Cancel subscription
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel your subscription?</DialogTitle>
          <DialogDescription>
            You will keep Pro until {until}. After that: {essaysPerWeek} essay
            marks and {coachPerWeek} Coach messages a week, and your band
            history goes back to the last five attempts. Reading practice and
            lessons stay unlimited.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose
            render={
              <Button type="button" variant="outline">
                Keep Pro
              </Button>
            }
          />
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const { ok } = await cancelPro();
                if (ok) setOpen(false);
                else setError('Could not cancel just then. Please try again.');
              })
            }
          >
            {pending ? 'Cancelling…' : 'Cancel it'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
