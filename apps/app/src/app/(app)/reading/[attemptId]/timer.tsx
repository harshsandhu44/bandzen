'use client';

import { useEffect, useState } from 'react';
import { cn } from '@bandzen/ui/lib/utils';

/**
 * Counts down from a server-issued start time rather than from mount, so a
 * refresh mid-test does not hand the candidate a fresh hour.
 */
export function Timer({
  startedAt,
  minutes,
}: {
  startedAt: string;
  minutes: number;
}) {
  const deadline = new Date(startedAt).getTime() + minutes * 60_000;
  const [remaining, setRemaining] = useState(() => deadline - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemaining(deadline - Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const expired = remaining <= 0;
  const total = Math.max(0, Math.floor(remaining / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');

  return (
    <p
      role="timer"
      aria-live="off"
      className={cn(
        'font-metric text-metric-sm tabular-nums',
        expired ? 'text-destructive' : total < 300 && 'text-chrome',
      )}
    >
      {mm}:{ss}
    </p>
  );
}
