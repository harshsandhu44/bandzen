'use client';

import { useEffect } from 'react';
import { Button } from '@bandzen/ui/components/button';
import { Eyebrow } from '@bandzen/ui/components/primitives';

/**
 * The CMS error boundary. Says what to do next; the thrown error may carry
 * query detail that has no place on screen, so the message stays generic and
 * the console keeps the full thing.
 */
export default function CmsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[cms] unhandled', error);
  }, [error]);

  return (
    <div className="max-w-md space-y-4">
      <Eyebrow>Something broke</Eyebrow>
      <h1 className="font-title text-title-lg">This page did not load</h1>
      <p className="text-sm text-muted-foreground">
        Nothing you saved is lost. Try again, and if it keeps happening the
        reference below tells us where to look.
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
