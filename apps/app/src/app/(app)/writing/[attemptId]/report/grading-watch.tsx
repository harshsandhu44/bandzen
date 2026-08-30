'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { gradingStatus } from '../../actions';

/**
 * Waits for the grader to finish.
 *
 * Neon has no change feed, so this polls rather than subscribing the way the
 * Supabase build did. Grading takes 20-40 seconds, so a 4-second interval
 * costs at most a handful of requests per essay — cheaper than standing up a
 * websocket tier for one screen.
 */
export function GradingWatch({ attemptId }: { attemptId: string }) {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const id = setInterval(async () => {
      try {
        const status = await gradingStatus(attemptId);
        if (cancelled) return;
        if (status === 'complete' || status === 'failed') {
          clearInterval(id);
          router.refresh();
        }
      } catch {
        // A failed poll is not worth surfacing; the next tick retries.
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [attemptId, router]);

  return null;
}
