import { studyPlan } from '@/content/sections';

import { Container, Eyebrow } from './section';

export function StudyPlanSection() {
  return (
    <section className="bg-paper text-ink relative isolate py-24 md:py-32 lg:py-40">
      <Container>
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-32">
              <Eyebrow>{studyPlan.eyebrow}</Eyebrow>
              <h2 className="font-display text-display-2 mt-6 text-balance">
                {studyPlan.headline}
              </h2>
              <p className="text-slate mt-6 leading-relaxed">
                {studyPlan.support}
              </p>

              <dl className="border-ink mt-10 grid grid-cols-2 border">
                <div className="border-ink border-r p-5">
                  <dt className="text-slate font-mono text-[0.5625rem] tracking-[0.2em] uppercase">
                    Target
                  </dt>
                  <dd className="font-display mt-1 text-3xl">
                    {studyPlan.target}
                  </dd>
                </div>
                <div className="p-5">
                  <dt className="text-slate font-mono text-[0.5625rem] tracking-[0.2em] uppercase">
                    Test in
                  </dt>
                  <dd className="font-display mt-1 text-3xl tabular-nums">
                    {studyPlan.daysLeft}
                    <span className="text-slate ml-1 font-mono text-sm">
                      days
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Timeline. The rule down the left is the spine. */}
          <div className="lg:col-span-8">
            <ol className="border-border relative flex flex-col gap-12 border-l pl-8 sm:pl-12">
              {studyPlan.days.map((day, di) => (
                <li
                  key={day.label}
                  className="bz-reveal relative"
                  style={{ '--bz-i': di } as React.CSSProperties}
                >
                  <span
                    aria-hidden
                    className={
                      di === 0
                        ? 'bg-cobalt absolute top-2 -left-8 size-3 -translate-x-1/2 sm:-left-12'
                        : 'border-border bg-paper absolute top-2 -left-8 size-3 -translate-x-1/2 border sm:-left-12'
                    }
                  />
                  <h3
                    className={
                      di === 0
                        ? 'text-cobalt font-mono text-[0.6875rem] tracking-[0.24em] uppercase'
                        : 'text-slate font-mono text-[0.6875rem] tracking-[0.24em] uppercase'
                    }
                  >
                    {day.label}
                  </h3>

                  <ul className="mt-5 flex flex-col">
                    {day.tasks.map((task) => (
                      <li
                        key={task.title}
                        className="border-border group/task flex items-baseline gap-4 border-b py-4 last:border-b-0"
                      >
                        <span className="text-slate w-16 shrink-0 font-mono text-xs tabular-nums">
                          {task.minutes} min
                        </span>
                        <span className="font-display flex-1 text-xl sm:text-2xl">
                          {task.title}
                        </span>
                        <span className="text-slate hidden font-mono text-[0.5625rem] tracking-[0.16em] uppercase sm:block">
                          {task.module}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>

            <p className="text-slate mt-10 font-mono text-[0.625rem] tracking-[0.16em] uppercase">
              The plan rebuilds itself after every test
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
