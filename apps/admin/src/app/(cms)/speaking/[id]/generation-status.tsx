'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@bandzen/ui/components/button';

/**
 * Shown while any prompt in the test is missing its examiner audio. Kicks the
 * generation route once on mount, then refreshes every 4s until every prompt
 * has audio. On failure — or once the server marks the run stale (`timedOut`)
 * — it stops and offers a retry. Retrying resumes from the prompts still
 * missing audio, so a test that outran the 120s budget can be finished.
 */
export function GenerationStatus({
  testId,
  pending,
  error,
  timedOut = false,
}: {
  testId: string;
  pending: number;
  error: string | null;
  timedOut?: boolean;
}) {
  const router = useRouter();
  const kicked = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const halted = !!error || timedOut;

  useEffect(() => {
    let active = true;

    async function kick() {
      if (kicked.current) return;
      kicked.current = true;
      await fetch(`/api/speaking/${testId}/generate`, { method: 'POST' });
      if (active) router.refresh();
    }

    if (!halted) {
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
  }, [testId, halted, router]);

  async function retry() {
    setRetrying(true);
    kicked.current = true;
    await fetch(`/api/speaking/${testId}/generate`, { method: 'POST' });
    router.refresh();
    setRetrying(false);
  }

  return (
    <div className="space-y-2 border border-dashed border-border p-3 text-sm">
      {halted ? (
        <>
          <p className="font-mono text-xs text-destructive">
            {error
              ? `Generation failed: ${error}`
              : 'Generation timed out. A test with many prompts can exceed the time limit — try again to finish the ones still missing audio.'}
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
