import Link from 'next/link';
import { cn } from '@bandzen/ui/lib/utils';
import { IELTS_MODULES, MODULE_LABEL, type IELTSModule } from '@/lib/modules';

/**
 * The Learn section's own navigation: four modules, then the guides.
 *
 * Lessons and guides are one section with two shelves, so they share this row.
 * Resources keeps its own route -- it is categorised by topic, not by module,
 * so folding it into `/learn/[module]` would mean widening that param to hold a
 * value that is not a module. Only the sidebar entry went away.
 *
 * Underline tabs, not bordered pills: this row sits under a breadcrumb now, and
 * two boxed nav elements stacked read as competing. Plain links, so the current
 * shelf is in the URL and both pages stay server components.
 */

const TAB = 'border-b-2 pb-2.5 text-sm transition-colors';
const ON = 'border-foreground font-medium text-foreground';
const OFF = 'border-transparent text-muted-foreground hover:text-foreground';

export function LearnNav({ current }: { current: IELTSModule | 'guides' }) {
  return (
    <nav
      aria-label="Learn"
      className="-mb-px flex flex-wrap gap-x-6 border-b border-border"
    >
      {IELTS_MODULES.map((m) => (
        <Link
          key={m}
          href={`/learn/${m}`}
          aria-current={m === current ? 'page' : undefined}
          className={cn(TAB, m === current ? ON : OFF)}
        >
          {MODULE_LABEL[m]}
        </Link>
      ))}

      <Link
        href="/resources"
        aria-current={current === 'guides' ? 'page' : undefined}
        className={cn(TAB, current === 'guides' ? ON : OFF)}
      >
        Guides
      </Link>
    </nav>
  );
}
