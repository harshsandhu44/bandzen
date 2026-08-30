'use client';

import { useEffect } from 'react';

const SUPPORTS_NATIVE =
  typeof CSS !== 'undefined' &&
  CSS.supports?.('animation-timeline: view()') === true;

/**
 * Reveal-on-enter fallback for browsers without scroll-driven CSS animation
 * (Firefox, as of now). Chrome and Safari take the native path and this hook
 * returns immediately without observing anything.
 *
 * It marks <html> with `js-reveal` first, which is what allows the stylesheet
 * to hide `.bz-reveal` elements at all — without JS they stay visible.
 */
export function useReveal() {
  useEffect(() => {
    if (SUPPORTS_NATIVE) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const root = document.documentElement;
    root.classList.add('js-reveal');

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.revealed = '';
          io.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );

    document.querySelectorAll('.bz-reveal').forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      root.classList.remove('js-reveal');
    };
  }, []);
}
