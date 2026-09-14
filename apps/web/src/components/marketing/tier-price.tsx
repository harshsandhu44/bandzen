import { cn } from '@bandzen/ui/lib/utils';
import { formatMoney, planByKey, priceOf } from '@bandzen/pricing/plans';
import { foundingPrice } from '@bandzen/pricing/polar';

import { resolveCurrency } from '@/lib/currency';
import { polarPricing } from '@/lib/polar';

/**
 * The one part of the marketing site that differs per visitor.
 *
 * It reads the request, so it cannot be prerendered — which is exactly why it
 * is its own component, suspended inside a static page. The shell, the
 * features and the call to action are still built once; only this hole is
 * filled per request.
 */

/**
 * A floor, applied to both the fallback and the real thing.
 *
 * The founding price renders two extra lines that the standard price does not,
 * so without a shared minimum the card would shrink when the stream lands and
 * shunt everything below it upwards.
 */
export const priceBlockHeight = {
  free: 'min-h-[3.75rem]',
  pro: 'min-h-[7.25rem]',
} as const;

type Tier = keyof typeof priceBlockHeight;

export async function TierPrice({
  plan,
  period,
  featured,
}: {
  plan: Tier;
  period: string;
  featured: boolean;
}) {
  const currency = await resolveCurrency();
  const muted = featured ? 'text-paper/60' : 'text-slate';

  if (plan === 'free') {
    return <Amount value={formatMoney(0, currency)} period={period} muted={muted} />;
  }

  const { prices, founding } = await polarPricing();
  const monthly = planByKey('monthly')!;
  const quarterly = planByKey('quarterly')!;

  const standard = priceOf(prices, monthly, currency);
  const price = foundingPrice(standard, founding[monthly.key], currency);
  const discounted = price !== standard;

  return (
    <>
      <Amount value={formatMoney(price, currency)} period={period} muted={muted} />

      {/* Struck through only where it is real — the founding price genuinely
          rises to this one. */}
      {discounted ? (
        <p className={cn('mt-2 font-mono text-xs tracking-[0.14em] uppercase', muted)}>
          <span className="line-through">{formatMoney(standard, currency)}</span>{' '}
          after the founding window
        </p>
      ) : null}

      <p className={cn('mt-1 font-mono text-xs tracking-[0.14em] uppercase', muted)}>
        or{' '}
        {formatMoney(
          foundingPrice(
            priceOf(prices, quarterly, currency),
            founding[quarterly.key],
            currency,
          ),
          currency,
        )}{' '}
        for 3 months
      </p>
    </>
  );
}

/** Reserves the block's height so nothing moves when the price streams in. */
export function TierPriceFallback({
  period,
  featured,
}: {
  period: string;
  featured: boolean;
}) {
  return (
    <Amount
      value="—"
      period={period}
      muted={featured ? 'text-paper/60' : 'text-slate'}
    />
  );
}

function Amount({
  value,
  period,
  muted,
}: {
  value: string;
  period: string;
  muted: string;
}) {
  return (
    <p className="font-display flex items-baseline gap-2 text-6xl tabular-nums">
      {value}
      <span className={cn('font-mono text-xs tracking-[0.14em] uppercase', muted)}>
        {period}
      </span>
    </p>
  );
}

/**
 * The same numbers in prose, for `/refunds`.
 *
 * The legal page quoted its own hardcoded price and its own claim about which
 * currency we charge in. Reading them from here is what stops it contradicting
 * the pricing table.
 */
export async function ProPriceSentence() {
  const currency = await resolveCurrency();
  const { prices, founding } = await polarPricing();
  const monthly = planByKey('monthly')!;
  const quarterly = planByKey('quarterly')!;

  const price = (key: 'monthly' | 'quarterly') => {
    const plan = key === 'monthly' ? monthly : quarterly;
    return formatMoney(
      foundingPrice(priceOf(prices, plan, currency), founding[key], currency),
      currency,
    );
  };

  return (
    <>
      Bandzen Pro is {price('monthly')} per month, or {price('quarterly')} for
      three months, charged in {currency}. Polar is the merchant of record for
      every purchase, and any sales tax or VAT due where you live is included in
      the price you see.
    </>
  );
}
