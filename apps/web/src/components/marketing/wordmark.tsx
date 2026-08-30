import { cn } from '@bandzen/ui/lib/utils';

/**
 * The wordmark. The band scale is the brand, so the mark carries it: a tick
 * under the "band" of Bandzen, landing where a target marker would.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'font-display relative inline-block text-xl leading-none tracking-[-0.045em] lowercase',
        className,
      )}
    >
      bandzen
      <span className="bg-chrome absolute -bottom-1 left-[0.32em] h-0.5 w-[1.62em]" />
    </span>
  );
}
