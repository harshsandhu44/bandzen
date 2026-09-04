'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, toast } from 'sonner';

import type { ActionResult } from '@/lib/action-result';

/**
 * The one place the CMS says "that worked" or "that failed". Every server
 * action returns an ActionResult (see ./action-result.ts); the client helpers
 * there turn one into a toast. Wired once in (cms)/layout.tsx.
 *
 * No rich colours: a success and a failure differ by their words and by a
 * left rule, the same restraint StatusBadge and the Delete buttons follow.
 */
export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            'rounded-none border border-border bg-popover text-popover-foreground font-mono text-xs',
          description: 'text-muted-foreground',
          actionButton: 'rounded-none bg-primary text-primary-foreground',
          cancelButton: 'rounded-none bg-muted text-muted-foreground',
          error: 'border-l-2 border-l-destructive',
          success: 'border-l-2 border-l-primary',
        },
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
    />
  );
}

export { toast };

/** Turn an ActionResult into a toast. No-op on a silent success. */
export function toastResult(result: ActionResult) {
  if (result.ok) {
    if (result.message) toast.success(result.message);
  } else {
    toast.error(result.message);
  }
}
