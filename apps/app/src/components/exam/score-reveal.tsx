'use client';

import { useEffect, useRef, useState } from 'react';
import { BandScale } from '@bandzen/ui/components/band-scale';

/**
 * The one orchestrated moment in the app: on a report or result screen the
 * band scale fills to the score once and the number counts up to meet it.
 *
 * It is triggered by arriving at a result, not by scrolling, so it stays
 * inside the house "no scroll animation" rule. `prefers-reduced-motion` skips
 * straight to the final frame (which is also the server-rendered one).
 */
export function BandReveal({
  value,
  target,
  label,
}: {
  value: number;
  target?: number;
  label?: string;
}) {
  const [shown, setShown] = useState(value);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    if (
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const duration = 900;
    const start = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3; // easeOutCubic
      setShown(t < 1 ? Number((value * eased).toFixed(1)) : value);
      if (t < 1) raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <div className="space-y-3">
      <p className="font-metric text-metric-lg tabular-nums">
        {shown.toFixed(1)}
      </p>
      <BandScale value={shown} target={target} label={label} variant="axis" />
    </div>
  );
}
