import { Check, Lock } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@bandzen/ui/components/button';
import { cn } from '@bandzen/ui/lib/utils';

import { cta, pricing } from '@/content/sections';

import { Container, Eyebrow } from './section';

export function Pricing() {
  return (
    <section
      id="pricing"
      className="bg-paper text-ink relative isolate py-24 md:py-32 lg:py-40"
    >
      <Container>
        <div className="max-w-2xl">
          <Eyebrow>{pricing.eyebrow}</Eyebrow>
          <h2 className="font-display text-display-2 mt-6 text-balance">
            {pricing.headline}
          </h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 md:gap-8">
          {pricing.tiers.map((tier, i) => (
            <div
              key={tier.name}
              className={cn(
                'bz-reveal relative flex flex-col border p-8 sm:p-10',
                tier.featured
                  ? 'border-ink bg-ink text-paper'
                  : 'border-ink bg-paper',
              )}
              style={{ '--bz-i': i } as React.CSSProperties}
            >
              <h3 className="font-mono text-[0.6875rem] tracking-[0.24em] uppercase">
                {tier.name}
              </h3>

              <p className="font-display mt-10 flex items-baseline gap-2 text-6xl tabular-nums">
                {tier.price}
                <span
                  className={cn(
                    'font-mono text-xs tracking-[0.14em] uppercase',
                    tier.featured ? 'text-paper/60' : 'text-slate',
                  )}
                >
                  {tier.period}
                </span>
              </p>

              {/* The standard price, struck through, only where it is real —
                  the founding price genuinely rises to this. */}
              {'was' in tier && tier.was ? (
                <p
                  className={cn(
                    'mt-2 font-mono text-xs tracking-[0.14em] uppercase',
                    tier.featured ? 'text-paper/60' : 'text-slate',
                  )}
                >
                  <span className="line-through">{tier.was}</span> after the
                  founding window
                </p>
              ) : null}

              {'alt' in tier && tier.alt ? (
                <p
                  className={cn(
                    'mt-1 font-mono text-xs tracking-[0.14em] uppercase',
                    tier.featured ? 'text-paper/60' : 'text-slate',
                  )}
                >
                  {tier.alt}
                </p>
              ) : null}

              <ul className="mt-10 flex flex-1 flex-col gap-3">
                {tier.features.map((f) => (
                  <li
                    key={f.label}
                    className={cn(
                      'flex items-start gap-3 text-sm',
                      f.planned &&
                        (tier.featured ? 'text-paper/60' : 'text-slate'),
                    )}
                  >
                    {f.planned ? (
                      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
                    ) : (
                      <Check
                        className={cn(
                          'mt-0.5 size-4 shrink-0',
                          tier.featured ? 'text-chrome' : 'text-cobalt',
                        )}
                        aria-hidden
                      />
                    )}
                    <span>
                      {f.label}
                      {f.planned ? (
                        <span className="ml-2 font-mono text-[0.5625rem] tracking-[0.18em] uppercase">
                          Planned
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                render={<Link href={cta.primary.href} />}
                nativeButton={false}
                size="xl"
                className={cn(
                  'mt-10 w-full font-mono text-xs tracking-[0.14em] uppercase',
                  tier.featured && 'bg-paper text-ink hover:bg-chrome',
                )}
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-slate mt-8 font-mono text-[0.625rem] tracking-[0.16em] uppercase">
          {pricing.note} Items marked planned do not work yet.
        </p>
      </Container>
    </section>
  );
}
