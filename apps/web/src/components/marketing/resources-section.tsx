import { ArrowUpRight } from 'lucide-react';

import { resources } from '@/content/sections';

import { Container, Eyebrow } from './section';

export function ResourcesSection() {
  return (
    <section
      id="resources"
      className="bg-paper text-ink relative isolate py-24 md:py-32 lg:py-40"
    >
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <Eyebrow>{resources.eyebrow}</Eyebrow>
            <h2 className="font-display text-display-2 mt-6">
              {resources.headline}
            </h2>
          </div>
          <p className="text-slate max-w-sm leading-relaxed">
            {resources.support}
          </p>
        </div>

        {/* An index, not cards — this is a library, so it reads as a list. */}
        <ul className="border-ink bz-stagger mt-16 border-t">
          {resources.items.map((item, i) => (
            <li
              key={item.title}
              className="bz-reveal border-ink border-b"
              style={{ '--bz-i': i } as React.CSSProperties}
            >
              <a
                href={resources.href}
                className="group/res hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-4 py-6 transition-colors focus-visible:outline-none sm:grid-cols-[3.5rem_1fr_10rem_auto] sm:px-4"
              >
                <span className="font-mono text-[0.625rem] tabular-nums opacity-50">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-display text-2xl sm:text-4xl">
                  {item.title}
                </span>
                <span className="hidden font-mono text-[0.625rem] tracking-[0.16em] uppercase opacity-60 sm:block">
                  {item.count}
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-[0.625rem] tracking-[0.16em] uppercase opacity-60">
                    {item.kind}
                  </span>
                  <ArrowUpRight
                    className="size-4 transition-transform duration-300 group-hover/res:translate-x-0.5 group-hover/res:-translate-y-0.5"
                    aria-hidden
                  />
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
