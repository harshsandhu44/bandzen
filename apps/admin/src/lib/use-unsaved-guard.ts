'use client';

import { useEffect } from 'react';

/**
 * Warn before leaving with unsaved edits. Covers reload / tab-close / external
 * navigation via `beforeunload`; the editors also guard their own in-app back
 * link. Next's App Router has no supported hook for intercepting client-side
 * route changes, so that is the seam we accept for now.
 *
 * ponytail: beforeunload only. Add a router-level interceptor if in-app
 * navigation away from a dirty editor turns out to bite in practice.
 */
export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}
