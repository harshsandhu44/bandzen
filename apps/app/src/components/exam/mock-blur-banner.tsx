'use client';

import { useBlurWarning } from '@/lib/use-blur-warning';

/** The soft, non-blocking nudge for leaving the tab mid-section. Mock only. */
export function MockBlurBanner() {
  const { warned, dismiss } = useBlurWarning(true);
  if (!warned) return null;

  return (
    <p
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-4 bg-chrome px-6 py-2 text-sm text-background"
    >
      <span>You left the tab — the section kept going.</span>
      <button
        type="button"
        onClick={dismiss}
        className="underline underline-offset-4"
      >
        Dismiss
      </button>
    </p>
  );
}
