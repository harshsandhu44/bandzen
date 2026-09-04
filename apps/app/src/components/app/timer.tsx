'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@bandzen/ui/lib/utils';

/**
 * Counts down from a server-issued start time rather than from mount, so a
 * refresh mid-test does not hand the candidate a fresh hour.
 *
 * `onExpire` fires once, the moment the clock crosses zero. What that means is
 * the caller's call: a diagnostic or mock auto-submits, standalone practice
 * just shows a "time's up" note and lets the candidate finish.
 */
export function Timer({
  startedAt,
  minutes,
  onExpire,
}: {
  startedAt: string;
  minutes: number;
  onExpire?: () => void;
}) {
  const deadline = new Date(startedAt).getTime() + minutes * 60_000;
  const [remaining, setRemaining] = useState(() => deadline - Date.now());
  const fired = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setRemaining(deadline - Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);

  useEffect(() => {
    if (remaining <= 0 && !fired.current) {
      fired.current = true;
      onExpire?.();
    }
  }, [remaining, onExpire]);

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
