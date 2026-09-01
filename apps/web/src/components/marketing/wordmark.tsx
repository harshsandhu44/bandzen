import { cn } from '@bandzen/ui/lib/utils';
import { Mark } from '@bandzen/ui/components/mark';

/**
 * The wordmark. The band scale is the brand, so the mark carries it: a tick
 * under the "band" of Bandzen, landing where a target marker would.
 *
 * The mark leads the lockup, at the same scale it has in the browser tab. Its
 * tick and the one under "band" are the same device at two sizes, so they read
 * as a pair rather than a repeat.
 *
 * Stays `aria-hidden` and stays a span: every call site wraps this in its own
 * link and supplies the accessible name.
 */
export function Wordmark({
  collapse = false,
  className,
}: {
  /**
   * Drop the name below `sm` and show the mark alone. For the navbar, where
   * the lockup competes with the menu button and the CTA — not for the footer
   * or the 404, where the wordmark is the brand block itself.
   */
  collapse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'font-display inline-flex items-center gap-2 text-xl leading-none',
        className,
      )}
    >
      <Mark />
      <span
        className={cn(
          'relative tracking-[-0.045em] lowercase',
          collapse && 'hidden sm:inline',
        )}
      >
        bandzen
        <span className="bg-chrome absolute -bottom-1 left-[0.32em] h-0.5 w-[1.62em]" />
      </span>
    </span>
  );
}
