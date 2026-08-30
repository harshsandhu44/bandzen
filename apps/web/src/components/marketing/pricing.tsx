import { Check } from 'lucide-react';
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

              {tier.placeholderPrice && (
                <span
                  data-placeholder="true"
                  className="border-chrome text-chrome mt-5 self-start border px-2 py-1 font-mono text-[0.5rem] tracking-[0.18em] uppercase"
                >
                  Placeholder price
                </span>
              )}

              <p
                className={cn(
                  'font-display flex items-baseline gap-2 text-6xl tabular-nums',
                  tier.placeholderPrice ? 'mt-4' : 'mt-10',
                )}
                data-placeholder={tier.placeholderPrice ? 'true' : undefined}
              >
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

              <ul className="mt-10 flex flex-1 flex-col gap-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check
                      className={cn(
                        'mt-0.5 size-4 shrink-0',
                        tier.featured ? 'text-chrome' : 'text-cobalt',
                      )}
                      aria-hidden
                    />
                    {f}
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
          Pro pricing is not final. The figure shown is a placeholder.
        </p>
      </Container>
    </section>
  );
}
