import Link from 'next/link';
import { cn } from '@bandzen/ui/lib/utils';

/**
 * Filters as links, not state.
 *
 * The current filter belongs in the URL: it survives a refresh, it can be
 * shared, the back button undoes it, and the page stays a server component
 * with no hydration cost. Nothing here needs React.
 */

export type FilterOption = { value: string; label: string };

export function FilterBar({
  legend,
  param,
  options,
  active,
  basePath,
  params,
}: {
  legend: string;
  /** The search param this group controls. */
  param: string;
  options: readonly FilterOption[];
  active: string | null;
  basePath: string;
  /** The other params in play, so switching one filter keeps the rest. */
  params: Record<string, string | undefined>;
}) {
  const href = (value: string) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, [param]: value })) {
      if (v) next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[0.625rem] tracking-[0.2em] text-muted-foreground uppercase">
        {legend}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const on = (active ?? '') === option.value;
          return (
            <Link
              key={option.value || 'all'}
              href={href(option.value)}
              aria-current={on ? 'true' : undefined}
              className={cn(
                'border px-2.5 py-1 font-mono text-[0.625rem] tracking-[0.16em] uppercase transition-colors',
                on
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
