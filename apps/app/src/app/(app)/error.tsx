'use client';

import { useEffect } from 'react';
import { Button } from '@bandzen/ui/components/button';

/**
 * The signed-in error boundary.
 *
 * Says what to do next rather than apologising. The message is deliberately
 * generic — the thrown error may carry query detail that has no business on a
 * candidate's screen — but it is logged in full for us.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app] unhandled', error);
  }, [error]);

  return (
    <div className="max-w-md space-y-4 py-10">
      <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
        Something broke
      </p>
      <h1 className="text-2xl font-medium tracking-tight">
        This page did not load
      </h1>
      <p className="text-sm text-muted-foreground">
        Nothing you have submitted is affected — attempts and marked work are
        saved as you go. Try again, and if it keeps happening the reference
        below will tell us where to look.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Reference {error.digest}
        </p>
      ) : null}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
