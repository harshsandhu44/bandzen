import type { ReactNode } from 'react';

import { cn } from '@bandzen/ui/lib/utils';

/**
 * The docs' callout, which borrows the product's restriction vocabulary rather
 * than inventing a second one.
 *
 * `apps/app/src/components/billing/pro.tsx` establishes three marks a candidate
 * has already learned to tell apart, and a page describing one of those states
 * should carry the same mark as the screen it describes:
 *
 * - `note` — a plain rule. Something worth knowing.
 * - `pro` — `--chrome`, the token this product reserves for things that mean
 *   something. Pay-gated, and always openable.
 * - `locked` — muted and dashed, the `EmptyState` idiom. Not built. Never a
 *   call to action, because no amount of money opens it.
 *
 * Square corners and no background wash: `base-lyra` is a `rounded-none` style
 * and a tinted rounded box would be the one soft shape on the site.
 */
const TONES = {
  note: {
    box: 'border-l-2 border-foreground',
    label: 'text-muted-foreground',
  },
  pro: {
    box: 'border-l-2 border-chrome',
    label: 'text-chrome',
  },
  locked: {
    box: 'border border-dashed border-border',
    label: 'text-muted-foreground',
  },
} as const;

export function Callout({
  tone = 'note',
  title,
  children,
}: {
  tone?: keyof typeof TONES;
  title?: string;
  children: ReactNode;
}) {
  const styles = TONES[tone];

  return (
    <div
      className={cn(
        'my-6 py-3 pr-4 pl-5',
        styles.box,
        tone === 'locked' && 'px-5',
      )}
    >
      {title ? (
        <p
          className={cn(
            'font-mono text-[0.6875rem] tracking-[0.18em] uppercase',
            styles.label,
          )}
        >
          {title}
        </p>
      ) : null}
      <div className="[&>p:first-child]:mt-0 [&>p]:text-sm [&>ul]:text-sm">
        {children}
      </div>
    </div>
  );
}
