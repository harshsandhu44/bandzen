'use client';

import * as ResizablePrimitive from 'react-resizable-panels';

import { cn } from '@bandzen/ui/lib/utils';

/**
 * Draggable split panes. The exam runner is the one place this app needs
 * them — passage on one side, questions on the other, the candidate sets the
 * ratio. `react-resizable-panels` can persist that ratio itself via
 * `autoSaveId` on the group.
 */
function ResizablePanelGroup({
  className,
  ...props
}: ResizablePrimitive.GroupProps) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      className={cn(
        'flex h-full w-full aria-[orientation=vertical]:flex-col',
        className,
      )}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: ResizablePrimitive.PanelProps) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ResizablePrimitive.SeparatorProps & { withHandle?: boolean }) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        'relative flex w-2 shrink-0 items-center justify-center border-x border-border bg-secondary outline-none transition-colors after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2 hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring aria-[orientation=horizontal]:h-2 aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:border-x-0 aria-[orientation=horizontal]:border-y',
        className,
      )}
      {...props}
    >
      <div
        aria-hidden
        className="h-6 w-0.5 rounded-full bg-muted-foreground/40 aria-[orientation=horizontal]:h-0.5 aria-[orientation=horizontal]:w-6"
      />
      {withHandle ? null : null}
    </ResizablePrimitive.Separator>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
