'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { Eyebrow } from '@bandzen/ui/components/primitives';
import { cn } from '@bandzen/ui/lib/utils';

import type { Heading } from '@/content/docs-index';

/**
 * "On this page".
 *
 * The headings come from the build — `buildDocsIndex()` reads them out of the
 * `.mdx` sources — rather than from the rendered DOM, so the list is in the
 * server HTML and this component's only state is which heading is current.
 *
 * `rehype-slug` puts the matching ids on the headings themselves, so the
 * anchors resolve without anything being wired up between the two.
 */
export function Toc({ headings }: { headings: Record<string, Heading[]> }) {
  const pathname = usePathname();
  const current = headings[pathname] ?? [];
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (current.length === 0) return;

    // Bottom margin at -70% so a heading counts as current while its section is
    // in the upper third of the viewport, rather than only at the instant it
    // crosses the top edge.
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records.filter((record) => record.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );

    for (const heading of current) {
      const node = document.getElementById(heading.id);
      if (node) observer.observe(node);
    }

    return () => observer.disconnect();
    // `pathname` rather than `current`: the array is rebuilt on every render,
    // and re-running this on identity alone would tear down the observer
    // constantly.
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // One heading is a page with no structure worth summarising.
  if (current.length < 2) return null;

  return (
    <nav aria-labelledby="toc-heading" className="space-y-3">
      <Eyebrow as="h2" className="pl-3">
        On this page
      </Eyebrow>

      <ul className="space-y-1.5 border-l border-border">
        {current.map((heading) => {
          const active = heading.id === activeId;
          return (
            <li key={heading.id} className="relative">
              {/* The same chrome tick the sidebar uses, at heading scale. */}
              <span
                aria-hidden
                className={cn(
                  'absolute inset-y-0 -left-px w-0.5',
                  active ? 'bg-chrome' : 'bg-transparent',
                )}
              />
              <a
                href={`#${heading.id}`}
                aria-current={active ? 'location' : undefined}
                className={cn(
                  'block py-0.5 pl-3 text-xs leading-5 text-pretty transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  heading.level === 3 && 'pl-6',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
