import { mockTest } from '@/content/sections';

import { ExamWindow } from './exam-window';
import { Container, Eyebrow } from './section';

export function MockTestSection() {
  return (
    <section
      id="mock-tests"
      className="bg-ink text-paper relative isolate overflow-clip py-24 md:py-32 lg:py-40"
    >
      <Container>
        <div className="max-w-3xl">
          <Eyebrow>{mockTest.eyebrow}</Eyebrow>
          <h2 className="font-display text-display-2 mt-6">
            {mockTest.headline}
          </h2>
          <p className="text-paper/60 mt-6 max-w-xl leading-relaxed">
            {mockTest.support}
          </p>
        </div>

        {/* The window is pinned while the badges scroll past it. */}
        <div className="mt-16 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-8">
            <div className="lg:sticky lg:top-28">
              <ExamWindow />
            </div>
          </div>

          <ul className="bz-stagger border-paper/15 flex flex-col border-t lg:col-span-4">
            {mockTest.badges.map((badge, i) => (
              <li
                key={badge.label}
                className="bz-reveal border-paper/15 border-b py-7"
                style={{ '--bz-i': i } as React.CSSProperties}
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-chrome font-mono text-[0.625rem] tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-mono text-[0.6875rem] tracking-[0.18em] uppercase">
                    {badge.label}
                  </h3>
                </div>
                <p className="text-paper/60 mt-3 pl-8 text-sm leading-snug">
                  {badge.note}
                </p>
              </li>
            ))}
            <li className="text-paper/70 pt-7 text-xs leading-relaxed">
              Conditions match the real test. Scores do not — every band Bandzen
              reports is an estimate.
            </li>
          </ul>
        </div>
      </Container>
    </section>
  );
}
