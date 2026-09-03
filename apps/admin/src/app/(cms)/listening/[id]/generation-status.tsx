'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@bandzen/ui/components/button';

/**
 * Shown in place of the audio player or the transcript box while the other one
 * is being generated. Kicks the generation route once on mount, then polls the
 * page (via router.refresh) until the field lands. On failure it stops polling
 * and offers a retry.
 *
 * The parent only renders this when the field is actually missing, so once
 * generation succeeds the component unmounts and the interval is cleared.
 */
export function GenerationStatus({
  trackId,
  missing,
  error,
}: {
  trackId: string;
  missing: 'audio' | 'transcript';
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
      await fetch(`/api/listening/${trackId}/generate`, { method: 'POST' });
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
  }, [trackId, error, router]);

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
          {working} This page refreshes itself.
        </p>
      )}
    </div>
  );
}
