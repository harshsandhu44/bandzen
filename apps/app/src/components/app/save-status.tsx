'use client';

import type { AutosaveStatus } from '@/lib/use-autosave';

/**
 * What autosave is doing, in words rather than a colour.
 *
 * Silent when idle: a candidate under exam timing does not need a green tick
 * telling them nothing is wrong. It speaks up only when something is.
 */
export function SaveStatus({
  status,
  onRetry,
}: {
  status: AutosaveStatus;
  onRetry: () => void;
}) {
  if (status === 'idle') return null;

  if (status === 'failed') {
    return (
      <span
        role="alert"
        className="flex items-center gap-2 font-mono text-xs tracking-widest text-destructive uppercase"
      >
        Not saved
        <button
          type="button"
          onClick={onRetry}
          className="underline underline-offset-4"
        >
          Retry
        </button>
      </span>
    );
  }

  return (
    <span
      role="status"
      className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase"
    >
      {status === 'reconnecting' ? 'Reconnecting…' : 'Saving…'}
    </span>
  );
}
