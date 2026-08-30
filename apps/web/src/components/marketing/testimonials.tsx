import { Avatar, AvatarFallback } from '@bandzen/ui/components/avatar';

import { testimonials } from '@/content/sections';

import { Container, Eyebrow } from './section';

/** Deliberately varied spans — a rigid 3-column grid would read as filler. */
const SPANS = [
  'lg:col-span-7',
  'lg:col-span-5',
  'lg:col-span-5',
  'lg:col-span-7',
] as const;

export function Testimonials() {
  return (
    <section className="bg-secondary text-ink relative isolate py-24 md:py-32">
      <Container>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow className="text-destructive opacity-100">
              {testimonials.eyebrow}
            </Eyebrow>
            <h2 className="font-display text-display-3 mt-4">
              {testimonials.headline}
            </h2>
          </div>
          <p className="border-destructive/40 text-slate max-w-sm border-l-2 pl-4 text-sm leading-relaxed">
            {testimonials.note}
          </p>
        </div>

        <div className="bz-stagger mt-14 grid gap-6 lg:grid-cols-12">
          {testimonials.items.map((item, i) => (
            <figure
              key={item.initials}
              data-placeholder="true"
              className={`bz-reveal border-ink bg-paper relative flex flex-col justify-between border p-8 ${SPANS[i]}`}
              style={{ '--bz-i': i } as React.CSSProperties}
            >
              <span className="border-destructive/40 text-destructive absolute top-0 right-0 border-b border-l px-2 py-1 font-mono text-[0.5rem] tracking-[0.18em] uppercase">
                Placeholder
              </span>

              <blockquote className="font-display text-2xl leading-tight text-pretty sm:text-3xl">
                &ldquo;{item.quote}&rdquo;
              </blockquote>

              <figcaption className="mt-8 flex items-center gap-3">
                <Avatar className="border-ink size-9 border">
                  <AvatarFallback className="bg-secondary font-mono text-[0.625rem]">
                    {item.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-slate font-mono text-[0.625rem] tracking-[0.14em] uppercase">
                  {item.role}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
