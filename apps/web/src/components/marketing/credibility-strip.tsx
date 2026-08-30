import { credibility } from '@/content/sections';

import { Container } from './section';

/**
 * Capability marquee. Deliberately not social proof — Bandzen has no user
 * numbers to quote, so this states what the platform does instead of
 * inventing who uses it.
 */
export function CredibilityStrip() {
  return (
    <section
      aria-label="What Bandzen covers"
      className="bg-ink text-paper relative isolate overflow-clip py-16 md:py-20"
    >
      <Container>
        <h2 className="font-display text-display-3 max-w-2xl">
          {credibility.headline}
        </h2>
      </Container>

      <div className="bz-marquee-group relative mt-12 flex overflow-hidden">
        {/* Two identical runs; the track translates exactly -50%. */}
        <div className="bz-marquee flex shrink-0 items-center gap-10 pr-10">
          {[...credibility.items, ...credibility.items].map((item, i) => (
            <span
              key={`${item}-${i}`}
              aria-hidden={i >= credibility.items.length}
              className="flex shrink-0 items-center gap-10 font-mono text-sm tracking-[0.14em] whitespace-nowrap uppercase"
            >
              {item}
              <span className="bg-chrome inline-block size-1.5 rotate-45" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
