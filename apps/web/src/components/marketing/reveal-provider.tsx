'use client';

import { useReveal } from '@bandzen/ui/hooks/use-reveal';

/**
 * Activates the IntersectionObserver reveal fallback. Renders nothing, and
 * does nothing at all on browsers with native scroll-driven animation.
 */
export function RevealProvider() {
  useReveal();
  return null;
}
