import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@bandzen/ui/components/button';
import { BandScale } from '@bandzen/ui/components/band-scale';

import { cta, finalCta } from '@/content/sections';

import { Container } from './section';

export function FinalCta() {
  return (
    <section className="bg-ink text-paper relative isolate overflow-clip py-32 md:py-44">
      {/* The band the whole page has been climbing toward, at page scale,
          moving behind the copy at its own rate. */}
      <span
        aria-hidden
        className="font-display bz-drift text-paper/[0.06] pointer-events-none absolute inset-x-0 top-1/2 -z-10 -translate-y-1/2 text-center text-[28vw] leading-none select-none"
        style={{ '--bz-drift': '-6rem' } as React.CSSProperties}
      >
        {finalCta.band}
      </span>

      <Container>
        <h2 className="font-display text-display-1 max-w-4xl">
          <span className="block">{finalCta.headline[0]}</span>
          <span className="text-chrome block">{finalCta.headline[1]}</span>
        </h2>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            render={<Link href={cta.primary.href} />}
            nativeButton={false}
            size="xl"
            className="group/cta bg-paper text-ink hover:bg-chrome font-mono text-xs tracking-[0.14em] uppercase"
          >
            {cta.primary.label}
            <ArrowRight
              aria-hidden
              className="transition-transform duration-300 group-hover/cta:translate-x-1"
            />
          </Button>
          <Button
            render={<Link href={cta.secondary.href} />}
            nativeButton={false}
            variant="outline"
            size="xl"
            className="text-paper border-paper/30 hover:bg-paper/10 hover:text-paper bg-transparent font-mono text-xs tracking-[0.14em] uppercase"
          >
            Take diagnostic test
          </Button>
        </div>

        <div className="mt-20 max-w-xl">
          <BandScale
            variant="arrival"
            animate
            value={7}
            target={8}
            label="Target band"
          />
        </div>
      </Container>
    </section>
  );
}
