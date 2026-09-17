'use client';

import { useState, useTransition } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@bandzen/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@bandzen/ui/components/dropdown-menu';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import {
  movePlanTask,
  pausePlan,
  replanRemaining,
  skipPlanTask,
} from '@/app/(app)/plan/actions';
import { addDays } from '@/lib/study-plan';

const trigger =
  'flex size-7 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring';

/**
 * One task's controls (#131): skip it, or move it to tomorrow or a later day.
 * The task keeps its identity either way, so its history says what happened.
 */
export function TaskMenu({
  id,
  label,
  date,
  today,
}: {
  id: string;
  label: string;
  /** The task's own day, ISO. */
  date: string;
  /** The candidate's today, ISO: a task can only move after it. */
  today: string;
}) {
  const nextDay = addDays(date, 1);
  const tomorrow = addDays(today, 1);
  const [dialog, setDialog] = useState<'skip' | 'move' | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (action: (fd: FormData) => Promise<void>, fd: FormData) =>
    startTransition(async () => {
      fd.set('id', id);
      await action(fd);
      setDialog(null);
    });

  const moveTo = (date: string) => {
    const fd = new FormData();
    fd.set('date', date);
    submit(movePlanTask, fd);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={trigger}
          aria-label={`Options for ${label}`}
          disabled={pending}
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => moveTo(nextDay)}>
            {date === today ? 'Move to tomorrow' : 'Move to the next day'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog('move')}>
            Pick a day…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog('skip')}>
            Skip…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={dialog != null}
        onOpenChange={(open) => !open && setDialog(null)}
      >
        <DialogContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit(
                dialog === 'skip' ? skipPlanTask : movePlanTask,
                new FormData(e.currentTarget),
              );
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {dialog === 'skip' ? 'Skip this task?' : 'Move this task'}
              </DialogTitle>
              <DialogDescription>{label}</DialogDescription>
            </DialogHeader>
            {dialog === 'skip' ? (
              <div className="space-y-1">
                <Label htmlFor="skip-reason">Why? (optional)</Label>
                <Input id="skip-reason" name="reason" maxLength={200} />
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="move-date">To</Label>
                <Input
                  id="move-date"
                  name="date"
                  type="date"
                  min={tomorrow}
                  defaultValue={nextDay}
                  required
                  className="w-44"
                />
              </div>
            )}
            <DialogFooter>
              <DialogClose
                render={
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                }
              />
              <Button type="submit" disabled={pending}>
                {dialog === 'skip' ? 'Skip it' : 'Move it'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** The whole plan's controls: pause it, or plan the rest of it again. */
export function PlanMenu() {
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={trigger}
        aria-label="Plan options"
        disabled={pending}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => startTransition(replanRemaining)}>
          Replan what is left
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => startTransition(pausePlan)}>
          Pause plan
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
