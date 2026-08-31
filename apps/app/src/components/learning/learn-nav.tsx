import Link from 'next/link';
import { cn } from '@bandzen/ui/lib/utils';
import { IELTS_MODULES, MODULE_LABEL, type IELTSModule } from '@/lib/modules';

/**
 * The Learn section's own navigation: four modules, then the guides.
 *
 * Lessons and guides are one section with two shelves, so they share a filter
 * row. Resources keeps its own route -- it is categorised by topic, not by
 * module, so folding it into `/learn/[module]` would mean widening that param
 * to hold a value that is not a module. Only the sidebar entry went away.
 *
 * Plain links, so the current shelf is in the URL and both pages stay server
 * components.
 */

const PILL = 'border px-3 py-1.5 text-sm transition-colors';
const ON = 'border-primary bg-primary/5 font-medium text-foreground';
const OFF = 'border-border text-muted-foreground hover:text-foreground';

export function LearnNav({ current }: { current: IELTSModule | 'guides' }) {
  return (
    <nav aria-label="Learn" className="flex flex-wrap gap-2">
      {IELTS_MODULES.map((m) => (
        <Link
          key={m}
          href={`/learn/${m}`}
          aria-current={m === current ? 'page' : undefined}
          className={cn(PILL, m === current ? ON : OFF)}
        >
          {MODULE_LABEL[m]}
        </Link>
      ))}

      <Link
        href="/resources"
        aria-current={current === 'guides' ? 'page' : undefined}
        className={cn(PILL, current === 'guides' ? ON : OFF)}
      >
        Guides
      </Link>
    </nav>
  );
}
