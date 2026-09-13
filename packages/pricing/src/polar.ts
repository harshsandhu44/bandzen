import { CURRENCIES, asCurrency, type Currency } from './currency.ts';
import { FALLBACK_PRICE, PLANS, type PlanKey, type PriceTable } from './plans.ts';

/**
 * Turning what Polar returns into what the pages render.
 *
 * Kept here, pure, and typed structurally rather than against the SDK so that
 * both apps read a price the same way and the arithmetic can be tested without
 * a network or a token. Nothing in this file imports Polar.
 */

/** The shape of a Polar product, reduced to what a price needs. */
export type PolarProduct = {
  id: string;
  prices: readonly {
    priceCurrency?: string | null;
    priceAmount?: number | null;
  }[];
};

/** The shape of a Polar fixed-amount discount, reduced to the same. */
export type PolarDiscount = {
  id: string;
  code?: string | null;
  endsAt?: Date | null;
  amounts?: Record<string, number> | null;
};

/** A live founding discount for one plan: what to apply, and what it takes off. */
export type Founding = {
  id: string;
  endsAt: Date;
  /** Minor units off, per currency. Absent means the offer misses that one. */
  off: Partial<Record<Currency, number>>;
};

/**
 * Polar's per-currency prices, indexed the way the pages ask for them.
 *
 * A currency Polar has no price for falls back rather than throwing: the page
 * quoting a stale number is recoverable, a page that will not render is not.
 * The checkout session is unaffected either way — it pins a currency and lets
 * Polar supply the amount, so nothing here can set a charge.
 */
export function toPriceTable(
  products: Partial<Record<PlanKey, PolarProduct | undefined>>,
): PriceTable {
  const table = {} as PriceTable;
  for (const plan of PLANS) {
    const byCurrency = {} as Record<Currency, number>;
    for (const currency of CURRENCIES) {
      byCurrency[currency] =
        amountIn(products[plan.key], currency) ??
        FALLBACK_PRICE[plan.key][currency];
    }
    table[plan.key] = byCurrency;
  }
  return table;
}

function amountIn(
  product: PolarProduct | undefined,
  currency: Currency,
): number | null {
  const match = product?.prices.find(
    (price) => asCurrency(price.priceCurrency?.toUpperCase()) === currency,
  );
  return positive(match?.priceAmount);
}

function positive(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

/** The discount code carrying the founding offer for a plan. */
export function foundingCode(key: PlanKey): string {
  return `FOUNDING_${key.toUpperCase()}`;
}

/**
 * The founding discounts, by plan, if they are within their own deadlines.
 *
 * One per plan because a Polar fixed discount holds one amount per currency:
 * it can take ₹500 off in rupees and nothing off in pounds, but it cannot take
 * ₹500 off the monthly plan and ₹1,000 off the quarterly one. Percentages
 * would need only one discount and cannot land on ₹999 from ₹1,499, so the
 * price on the invoice would carry stray paise.
 *
 * Both the id and the deadline come from here, so the page that advertises the
 * founding price and the session that applies it cannot resolve to different
 * discounts. A discount with no `ends_at` is ignored: the offer is defined by
 * having an end, and an open-ended one is a misconfiguration, not a better
 * deal.
 */
export function foundingFrom(
  discounts: readonly PolarDiscount[],
  now: Date = new Date(),
): Partial<Record<PlanKey, Founding>> {
  const found: Partial<Record<PlanKey, Founding>> = {};
  for (const plan of PLANS) {
    const match = discounts.find(
      (discount) => discount.code === foundingCode(plan.key),
    );
    if (!match?.endsAt || match.endsAt <= now) continue;
    found[plan.key] = { id: match.id, endsAt: match.endsAt, off: offsOf(match) };
  }
  return found;
}

function offsOf(discount: PolarDiscount): Partial<Record<Currency, number>> {
  const off: Partial<Record<Currency, number>> = {};
  for (const [raw, amount] of Object.entries(discount.amounts ?? {})) {
    const currency = asCurrency(raw.toUpperCase());
    const value = positive(amount);
    if (currency && value != null) off[currency] = value;
  }
  return off;
}

/**
 * What a plan costs once the founding discount is taken off, or the standard
 * price when the offer does not reach this currency.
 *
 * Floors at zero. A discount larger than the price is a misconfiguration, and
 * a negative price is a worse way to find out than a free month.
 */
export function foundingPrice(
  standard: number,
  founding: Founding | undefined,
  currency: Currency,
): number {
  const off = founding?.off[currency];
  return off == null ? standard : Math.max(0, standard - off);
}
