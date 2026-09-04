'use client';

import type { CSSProperties } from 'react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, toast, type ToasterProps } from 'sonner';
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';

/**
 * The one toast surface for the app. Transient confirmations ("Saved") and
 * non-blocking errors ("Autosave failed"); anything that must persist stays a
 * card. Colours resolve to the popover tokens so it follows the `.dark` swap.
 */
function Toaster(props: ToasterProps) {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster, toast };
