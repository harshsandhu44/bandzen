import Link from 'next/link';

import { Ruler } from '@/components/ruler';
import { NAV } from '@/content/nav';

export const metadata = {
  title: 'Bandzen docs',
  description:
    'How to use Bandzen — for candidates preparing for IELTS, and for teachers writing the content.',
};

/**
 * The front door.
 *
 * It opens on the band ruler rather than a headline over a gradient, because
 * the 0–9 scale is the one thing every page under it is ultimately about, and
 * it is already the logo, the favicon and the social image.
 *
 * Then the entry points, phrased as the sentence someone arrives already
 * thinking — "I just signed up", "I got a CMS role" — rather than as two
 * doors labelled by who you are. Most people know what they came to do before
 * they know which audience the site would file them under.
 */
const ENTRIES: { prompt: string; href: string }[] = [
  { prompt: 'I just signed up', href: '/candidates/setting-up' },
  { prompt: 'I want a starting band', href: '/candidates/the-diagnostic' },
  {
    prompt: 'I want to understand marking and bands',
    href: '/reference/band-scale',
  },
  {
    prompt: 'I am checking what Free includes',
    href: '/candidates/plans-and-limits',
  },
  { prompt: 'I got a CMS role', href: '/teachers/getting-access' },
  {
    prompt: 'I need to import content as JSON',
    href: '/teachers/importing-json',
  },
];

export default function DocsHome() {
  return (
    <div className="pb-8">
      <Ruler className="mb-10" />

      <h1 className="font-title text-title-lg">Bandzen documentation</h1>
      <p className="mt-4 text-[0.9375rem] leading-7 text-pretty">
        Bandzen is an IELTS preparation product. All four modules — Reading,
        Listening, Writing and Speaking — have marking engines behind them;
        Reading and Listening are marked by a fixed function, Writing and
        Speaking by a language model against the band descriptors. Speaking is
        Pro only. These pages describe what is built, and nothing else.
      </p>

      <h2 className="font-title text-title mt-12">Start where you are</h2>
      <div className="mt-5 grid gap-px border border-border bg-border sm:grid-cols-2">
        {ENTRIES.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="group flex items-baseline justify-between gap-4 bg-background p-5 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <span className="text-sm text-pretty">{entry.prompt}</span>
            <span
              aria-hidden
              className="font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground"
            >
              →
            </span>
          </Link>
        ))}
      </div>

      <h2 className="font-title text-title mt-14">Browse by area</h2>
      <ul className="mt-5 space-y-4">
        {NAV.map((group) => {
          const first = group.sections[0]?.pages[0];
          if (!first) return null;
          return (
            <li key={group.title}>
              <Link
                href={first.href}
                className="font-title text-base underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {group.title}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground text-pretty">
                {group.blurb}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
