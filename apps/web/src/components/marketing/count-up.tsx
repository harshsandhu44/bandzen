'use client';

import { animate, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

/**
 * Counts a band figure up when it enters the viewport. This is the one effect
 * on the page that genuinely cannot be done in CSS — a number has to be
 * interpolated and written to the DOM.
 *
 * The final value is server-rendered as the element's text, so with JS off, or
 * before hydration, the correct number is already on screen.
 */
export function CountUp({
  to,
  decimals = 1,
  className,
}: {
  to: number;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!inView || reduced) return;
    const el = ref.current;
    if (!el) return;

    const controls = animate(0, to, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = v.toFixed(decimals);
      },
    });
    return () => controls.stop();
  }, [inView, reduced, to, decimals]);

  return (
    <span ref={ref} className={className}>
      {to.toFixed(decimals)}
    </span>
  );
}
