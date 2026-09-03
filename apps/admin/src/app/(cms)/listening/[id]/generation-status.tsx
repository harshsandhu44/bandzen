'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@bandzen/ui/components/button';

/**
 * Shown in place of the audio player or the transcript box while the other one
 * is being generated. Kicks the generation route once on mount, then polls the
 * page (via router.refresh) until the field lands. On failure — or once the
 * server marks the run stale (`timedOut`) — it stops polling and offers a
 * retry rather than spinning forever, which is what happened when a long
 * synthesis outran the 120s function budget and left no error behind.
 */
export function GenerationStatus({
  trackId,
  missing,
  error,
  timedOut = false,
}: {
  trackId: string;
  missing: 'audio' | 'transcript';
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
      await fetch(`/api/listening/${trackId}/generate`, { method: 'POST' });
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
  }, [trackId, halted, router]);

  async function retry() {
    setRetrying(true);
    kicked.current = true;
    await fetch(`/api/listening/${trackId}/generate`, { method: 'POST' });
    router.refresh();
    setRetrying(false);
  }

  const working =
    missing === 'audio'
      ? 'Generating audio from the transcript…'
      : 'Transcribing the audio…';

  return (
    <div className="space-y-2 border border-dashed border-border p-3 text-sm">
      {halted ? (
        <>
          <p className="font-mono text-xs text-destructive">
            {error
              ? `Generation failed: ${error}`
              : 'Generation timed out. A large file can exceed the time limit — try again, and it picks up from what is still missing.'}
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
          {working} This page refreshes itself.
        </p>
      )}
    </div>
  );
}
