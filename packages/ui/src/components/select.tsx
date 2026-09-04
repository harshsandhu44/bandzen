import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';

import { cn } from '@bandzen/ui/lib/utils';

/**
 * A native <select> dressed to match Input. The CMS had the same class string
 * copy-pasted into every editor; this is that string, once. Native on purpose
 * — a content team on a phone gets the platform picker, and there are no
 * popover edge cases to own.
 */
function Select({
  className,
  children,
  ...props
}: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          'h-8 w-full min-w-0 appearance-none rounded-none border border-input bg-transparent py-1 pr-8 pl-2.5 text-xs transition-colors outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { Select };
