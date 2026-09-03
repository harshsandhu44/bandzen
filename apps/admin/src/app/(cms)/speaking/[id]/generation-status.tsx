'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@bandzen/ui/components/button';

/**
 * Shown while any prompt in the test is missing its examiner audio. Kicks the
 * generation route once on mount, then refreshes the page every 4s until every
 * prompt has audio. On failure it stops and offers a retry.
 *
 * Same shape as the listening CMS's GenerationStatus — the parent only renders
 * it while audio is actually missing, so it unmounts once generation succeeds.
 */
export function GenerationStatus({
  testId,
  pending,
  error,
}: {
  testId: string;
  pending: number;
  error: string | null;
}) {
  const router = useRouter();
  const kicked = useRef(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    let active = true;

    async function kick() {
      if (kicked.current) return;
      kicked.current = true;
      await fetch(`/api/speaking/${testId}/generate`, { method: 'POST' });
      if (active) router.refresh();
    }

    if (!error) {
      kick();
      const timer = setInterval(() => {
        if (active) router.refresh();
      }, 4000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }

    return () => {
      active = false;
    };
  }, [testId, error, router]);

  async function retry() {
    setRetrying(true);
    kicked.current = true;
    await fetch(`/api/speaking/${testId}/generate`, { method: 'POST' });
    router.refresh();
    setRetrying(false);
  }

  return (
    <div className="space-y-2 border border-dashed border-border p-3 text-sm">
      {error ? (
        <>
          <p className="font-mono text-xs text-destructive">
            Generation failed: {error}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={retry}
            disabled={retrying}
          >
            {retrying ? 'Retrying…' : 'Try again'}
          </Button>
        </>
      ) : (
        <p className="text-muted-foreground">
          Synthesizing examiner audio for {pending} prompt
          {pending === 1 ? '' : 's'}… This page refreshes itself.
        </p>
      )}
    </div>
  );
}
