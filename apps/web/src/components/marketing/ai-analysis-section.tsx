import { ArrowRight, Check, Minus } from 'lucide-react';

import { BandScale } from '@bandzen/ui/components/band-scale';

import { analysis, sampleReport } from '@/content/sections';

import { CountUp } from './count-up';
import { Container, Eyebrow } from './section';

export function AiAnalysisSection() {
  return (
    <section
      id="analysis"
      className="bg-paper text-ink relative isolate py-24 md:py-32 lg:py-40"
    >
      <Container>
        <div className="max-w-4xl">
          <Eyebrow>{analysis.eyebrow}</Eyebrow>
          <h2 className="font-display text-display-2 mt-6">
            <span className="block">{analysis.headline[0]}</span>
            <span className="text-cobalt block">{analysis.headline[1]}</span>
          </h2>
          <p className="text-slate mt-6 max-w-xl leading-relaxed">
            {analysis.support}
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-12">
          {/* Overall estimate */}
          <div className="border-ink bz-reveal flex flex-col justify-between border p-8 lg:col-span-5">
            <div>
              <p className="text-slate font-mono text-[0.625rem] tracking-[0.2em] uppercase">
                Overall estimate
              </p>
              <p className="font-display mt-2 text-[5rem] leading-none tabular-nums">
                <CountUp to={sampleReport.estimated} />
              </p>
              <p className="text-slate mt-1 font-mono text-xs tracking-[0.14em] uppercase">
                Band · estimate, not an official score
              </p>
            </div>

            <div className="mt-10">
              <div className="text-slate mb-3 flex items-baseline justify-between font-mono text-[0.625rem] tracking-[0.18em] uppercase">
                <span>Progress to target</span>
                <span className="tabular-nums">
                  {sampleReport.estimated.toFixed(1)} →{' '}
                  {sampleReport.target.toFixed(1)}
                </span>
              </div>
              <BandScale
                variant="axis"
                animate
                value={sampleReport.estimated}
                target={sampleReport.target}
                label="Overall estimate"
              />
            </div>
          </div>

          {/* Strengths / needs work */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            <div
              className="border-ink bz-reveal flex-1 border p-6"
              style={{ '--bz-i': 1 } as React.CSSProperties}
            >
              <p className="text-slate font-mono text-[0.625rem] tracking-[0.2em] uppercase">
                Strengths
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {analysis.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className="text-cobalt mt-0.5 size-3.5 shrink-0"
                      aria-hidden
                    />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="border-ink bg-ink text-paper bz-reveal flex-1 border p-6"
              style={{ '--bz-i': 2 } as React.CSSProperties}
            >
              <p className="text-paper/50 font-mono text-[0.625rem] tracking-[0.2em] uppercase">
                Needs work
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {analysis.needsWork.map((s) => (
                  <li key={s} className="flex items-start gap-2.5 text-sm">
                    <Minus
                      className="text-chrome mt-0.5 size-3.5 shrink-0"
                      aria-hidden
                    />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Next steps — the point of the whole section. */}
          <div
            className="border-ink bz-reveal border p-6 lg:col-span-3"
            style={{ '--bz-i': 3 } as React.CSSProperties}
          >
            <p className="text-slate font-mono text-[0.625rem] tracking-[0.2em] uppercase">
              Recommended next steps
            </p>
            <ol className="mt-4 flex flex-col gap-4">
              {analysis.nextSteps.map((step, i) => (
                <li key={step} className="group/step flex gap-3">
                  <span className="text-cobalt font-mono text-[0.625rem] tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 text-sm leading-snug">{step}</span>
                  <ArrowRight
                    className="text-slate mt-0.5 size-3.5 shrink-0 transition-transform duration-300 group-hover/step:translate-x-0.5"
                    aria-hidden
                  />
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </section>
  );
}
