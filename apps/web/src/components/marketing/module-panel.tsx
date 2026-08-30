import { Sparkle } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@bandzen/ui/lib/utils';

/**
 * Shared chrome for the four module demonstrations: the oversized background
 * word, the panel frame, and the AI insight footer. The contents differ per
 * module — that is where each one gets its personality.
 */
export function ModulePanel({
  name,
  insight,
  children,
  className,
}: {
  name: string;
  insight: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'bz-reveal border-ink group bg-paper relative isolate flex flex-col overflow-clip border',
        className,
      )}
    >
      {/* The module name at display scale, drifting behind its own demo. */}
      <span
        aria-hidden
        className="font-display bz-drift text-secondary pointer-events-none absolute -top-4 -right-4 -z-10 text-[7rem] leading-none select-none sm:text-[9rem]"
        style={{ '--bz-drift': '-2rem' } as React.CSSProperties}
      >
        {name.slice(0, 3).toUpperCase()}
      </span>

      <header className="border-border flex items-baseline justify-between border-b px-6 py-4">
        <h3 className="font-display text-2xl">{name}</h3>
        <span className="text-slate font-mono text-[0.5625rem] tracking-[0.2em] uppercase">
          Live demo
        </span>
      </header>

      <div className="flex-1 px-6 py-6">{children}</div>

      <footer className="bg-ink text-paper flex items-start gap-2.5 px-6 py-4">
        <Sparkle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <p className="text-[0.8125rem] leading-snug">
          <span className="sr-only">AI insight: </span>
          {insight}
        </p>
      </footer>
    </article>
  );
}
