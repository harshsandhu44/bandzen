import type { ReactNode } from 'react';

import { cn } from '@bandzen/ui/lib/utils';

type SectionProps = {
  id?: string;
  /** Ground colour. The page's rhythm comes from alternating these. */
  ground?: 'paper' | 'ink';
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  /** Opt out of the default vertical rhythm for full-bleed compositions. */
  bare?: boolean;
};

/**
 * Shared section shell: ground colour, vertical rhythm, and the mono eyebrow.
 * Sections differ by composition, not by wrapper — this only owns the things
 * that must stay consistent down the page.
 */
function Section({
  id,
  ground = 'paper',
  eyebrow,
  children,
  className,
  bare = false,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'relative isolate w-full overflow-clip',
        ground === 'ink' ? 'bg-ink text-paper' : 'bg-paper text-ink',
        !bare && 'py-24 md:py-32 lg:py-40',
        className,
      )}
    >
      {eyebrow && (
        <Eyebrow className="mx-auto mb-12 w-full max-w-7xl px-6 md:px-10">
          {eyebrow}
        </Eyebrow>
      )}
      {children}
    </section>
  );
}

/** The mono label that opens most sections. Also used standalone inside them. */
function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'font-mono text-[0.6875rem] tracking-[0.22em] uppercase opacity-60',
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Standard content gutter. Every section uses this unless it is full-bleed. */
function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl px-6 md:px-10', className)}>
      {children}
    </div>
  );
}

export { Section, Eyebrow, Container };
