import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@bandzen/ui/components/button';
import { BandScale } from '@bandzen/ui/components/band-scale';

import { diagnostic } from '@/content/sections';

import { Container, Eyebrow } from './section';

export function DiagnosticCta() {
  return (
    <section className="bg-cobalt text-paper relative isolate overflow-clip py-24 md:py-32">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <Eyebrow className="text-paper">{diagnostic.eyebrow}</Eyebrow>
            <h2 className="font-display text-display-2 mt-6">
              <span className="block">{diagnostic.headline[0]}</span>
              <span className="text-chrome block">
                {diagnostic.headline[1]}
              </span>
            </h2>
            <p className="text-paper/80 mt-6 max-w-lg leading-relaxed">
              {diagnostic.support}
            </p>
            <Button
              render={<Link href={diagnostic.cta.href} />}
              nativeButton={false}
              size="xl"
              className="group/cta bg-paper text-ink hover:bg-chrome mt-10 font-mono text-xs tracking-[0.14em] uppercase"
            >
              {diagnostic.cta.label}
              <ArrowRight
                aria-hidden
                className="transition-transform duration-300 group-hover/cta:translate-x-1"
              />
            </Button>
          </div>

          {/* ? → 6.5 → plan */}
          <div className="lg:col-span-6">
            <div className="border-paper/25 bg-cobalt border p-8">
              <div className="flex items-end justify-between gap-6">
                <div>
                  <p className="text-paper/85 font-mono text-[0.625rem] tracking-[0.2em] uppercase">
                    Before
                  </p>
                  <p className="font-display mt-1 text-6xl leading-none">?</p>
                </div>
                <ArrowRight className="text-paper/40 mb-3 size-6" aria-hidden />
                <div>
                  <p className="text-paper/85 font-mono text-[0.625rem] tracking-[0.2em] uppercase">
                    Estimated
                  </p>
                  <p className="text-chrome font-display mt-1 text-6xl leading-none tabular-nums">
                    {diagnostic.result.toFixed(1)}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <BandScale
                  variant="axis"
                  tone="inverse"
                  animate
                  value={diagnostic.result}
                  label="Diagnostic estimate"
                />
              </div>

              <ul className="border-paper/25 mt-8 flex flex-col gap-2 border-t pt-6">
                {['Strongest skills', 'Weakest areas', 'Personalised plan'].map(
                  (line) => (
                    <li
                      key={line}
                      className="flex items-center gap-2 font-mono text-[0.6875rem] tracking-[0.16em] uppercase"
                    >
                      <span className="bg-chrome size-1.5 rotate-45" />
                      {line}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
