import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { BandScale } from '@bandzen/ui/components/band-scale';
import { Button } from '@bandzen/ui/components/button';

import { cta, hero, sampleReport } from '@/content/sections';

import { Container, Eyebrow } from './section';
import { ScoreStack } from './score-stack';

export function Hero() {
  return (
    <section className="bg-paper text-ink relative isolate overflow-clip pt-32 pb-20 md:pt-44 md:pb-28">
      {/* Measure grid — the ruler motif at page scale, not decoration for its
          own sake: the columns are the 0–9 band intervals. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to right, var(--ink) 0 1px, transparent 1px calc(100% / 9))',
        }}
      />

      <Container>
        <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <Eyebrow>{hero.eyebrow}</Eyebrow>

            <h1 className="font-display text-display-1 mt-6">
              {/* Each line drifts at its own rate on scroll. */}
              <span
                className="bz-drift-scroll block"
                style={{ '--bz-drift': '-3rem' } as React.CSSProperties}
              >
                {hero.headline[0]}
              </span>
              <span
                className="bz-drift-scroll block"
                style={{ '--bz-drift': '-2rem' } as React.CSSProperties}
              >
                {hero.headline[1]}
              </span>
              <span
                className="bz-drift-scroll relative block"
                style={{ '--bz-drift': '-1rem' } as React.CSSProperties}
              >
                <span className="text-cobalt relative">
                  {hero.headlineAccent}
                  <span
                    aria-hidden
                    className="bg-chrome absolute inset-x-0 -bottom-1 h-[0.09em]"
                  />
                </span>
              </span>
            </h1>

            <p className="text-slate mt-8 max-w-xl text-base leading-relaxed text-balance sm:text-lg">
              {hero.support}
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                render={<Link href={cta.primary.href} />}
                nativeButton={false}
                size="xl"
                className="group/cta font-mono text-xs tracking-[0.14em] uppercase"
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
                className="font-mono text-xs tracking-[0.14em] uppercase"
              >
                {cta.secondary.label}
              </Button>
            </div>

            <p className="text-slate mt-5 font-mono text-[0.6875rem] tracking-[0.12em] uppercase">
              {hero.note}
            </p>

            {/* The signature, stated plainly the first time you meet it. */}
            <div className="mt-14 max-w-md">
              <div className="mb-3 flex items-baseline justify-between font-mono text-[0.625rem] tracking-[0.2em] uppercase opacity-60">
                <span>Band scale</span>
                <span>
                  {sampleReport.estimated.toFixed(1)} →{' '}
                  {sampleReport.target.toFixed(1)}
                </span>
              </div>
              <BandScale
                variant="axis"
                value={sampleReport.estimated}
                target={sampleReport.target}
                label="Overall estimate"
              />
            </div>
          </div>

          <div className="lg:col-span-5">
            <ScoreStack className="mx-auto max-w-md lg:max-w-none" />
          </div>
        </div>
      </Container>
    </section>
  );
}
