import { problem } from '@/content/sections';

import { Container, Eyebrow } from './section';

export function ProblemSection() {
  return (
    <section
      id="practice"
      className="bg-paper text-ink relative isolate py-24 md:py-32 lg:py-40"
    >
      <Container>
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-16">
          {/* Sticky thesis. The cards scroll past it, which is the point. */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <Eyebrow>{problem.eyebrow}</Eyebrow>
              <h2 className="font-display text-display-2 mt-6 text-balance">
                {problem.headline}
              </h2>
              <p className="text-slate mt-8 max-w-md leading-relaxed">
                {problem.support}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-7 lg:gap-10">
            {problem.feedback.map((item, i) => (
              <article
                key={item.module}
                className="bz-reveal border-ink bg-paper border p-6 sm:p-8"
                style={
                  {
                    '--bz-i': i,
                    marginLeft: `${(i % 2) * 6}%`,
                  } as React.CSSProperties
                }
              >
                <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="bg-ink text-paper px-2 py-1 font-mono text-[0.625rem] tracking-[0.18em] uppercase">
                    {item.module}
                  </span>
                  <span className="text-slate font-mono text-[0.625rem] tracking-[0.18em] uppercase">
                    {item.criterion}
                  </span>
                </header>
                <p className="mt-5 text-lg leading-snug text-pretty sm:text-xl">
                  {item.note}
                </p>
              </article>
            ))}
            <p className="text-slate font-mono text-[0.625rem] tracking-[0.18em] uppercase">
              Illustrative feedback
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
