'use client';

import { useEffect, useRef, useState } from 'react';
import { BandScale, type ScaleSpec } from '@bandzen/ui/components/band-scale';

/**
 * The one orchestrated moment in the app: on a report or result screen the
 * score scale fills to the score once and the number counts up to meet it, on
 * whichever exam's ruler the result belongs to.
 *
 * It is triggered by arriving at a result, not by scrolling, so it stays
 * inside the house "no scroll animation" rule. `prefers-reduced-motion` skips
 * straight to the final frame (which is also the server-rendered one).
 */
export function ScoreReveal({
  value,
  target,
  label,
  scale,
}: {
  value: number;
  target?: number;
  label?: string;
  scale: ScaleSpec;
}) {
  const [shown, setShown] = useState(value);
  const done = useRef(false);
  const decimals = Number.isInteger(scale.step) ? 0 : 1;

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
      // Count up from the bottom of this scale, not from zero: DET starts at 10.
      const current = scale.min + (value - scale.min) * eased;
      setShown(t < 1 ? Number(current.toFixed(decimals)) : value);
      if (t < 1) raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [value, scale.min, decimals]);

  return (
    <div className="space-y-3">
      <p className="font-metric text-metric-lg tabular-nums">
        {shown.toFixed(decimals)}
      </p>
      <BandScale
        value={shown}
        target={target}
        label={label}
        scale={scale}
        variant="axis"
      />
    </div>
  );
}
