import { RotateCcw, TrendingUp } from 'lucide-react';

import { comparison } from '@/content/sections';

import { Container, Eyebrow } from './section';

export function ComparisonSection() {
  return (
    <section className="bg-secondary text-ink relative isolate py-24 md:py-32 lg:py-40">
      <Container>
        <div className="max-w-2xl">
          <Eyebrow>{comparison.eyebrow}</Eyebrow>
          <h2 className="font-display text-display-2 mt-6 text-balance">
            {comparison.headline}
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 md:gap-10">
          {/* Traditional — the loop that closes on itself. */}
          <div className="border-slate/40 bz-reveal border border-dashed p-8">
            <header className="flex items-center gap-2.5">
              <RotateCcw className="text-slate size-4" aria-hidden />
              <h3 className="font-mono text-[0.6875rem] tracking-[0.2em] uppercase">
                {comparison.traditional.title}
              </h3>
            </header>

            <ol className="mt-8 flex flex-col">
              {comparison.traditional.steps.map((step, i) => (
                <li key={step}>
                  <p className="text-slate font-display text-2xl sm:text-3xl">
                    {step}
                  </p>
                  {i < comparison.traditional.steps.length - 1 && (
                    <span
                      aria-hidden
                      className="bg-slate/30 my-2 block h-6 w-px"
                    />
                  )}
                </li>
              ))}
            </ol>

            <p className="border-slate/30 text-slate mt-8 flex items-center gap-2 border-t pt-5 font-mono text-[0.625rem] tracking-[0.16em] uppercase">
              <RotateCcw className="size-3" aria-hidden />
              Back to the start, same band
            </p>
          </div>

          {/* Bandzen — the loop that climbs. */}
          <div
            className="border-ink bg-ink text-paper bz-reveal border p-8"
            style={{ '--bz-i': 1 } as React.CSSProperties}
          >
            <header className="flex items-center gap-2.5">
              <TrendingUp className="text-chrome size-4" aria-hidden />
              <h3 className="font-mono text-[0.6875rem] tracking-[0.2em] uppercase">
                {comparison.bandzen.title}
              </h3>
            </header>

            <ol className="mt-8 flex flex-col">
              {comparison.bandzen.steps.map((step, i) => {
                const last = i === comparison.bandzen.steps.length - 1;
                return (
                  <li key={step}>
                    <p
                      className={
                        last
                          ? 'text-chrome font-display text-2xl sm:text-3xl'
                          : 'font-display text-2xl sm:text-3xl'
                      }
                    >
                      {step}
                    </p>
                    {!last && (
                      <span
                        aria-hidden
                        className="bg-paper/25 my-2 block h-6 w-px"
                      />
                    )}
                  </li>
                );
              })}
            </ol>

            <p className="border-paper/20 text-paper/60 mt-8 flex items-center gap-2 border-t pt-5 font-mono text-[0.625rem] tracking-[0.16em] uppercase">
              <TrendingUp className="size-3" aria-hidden />
              Each loop ends higher than it started
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
