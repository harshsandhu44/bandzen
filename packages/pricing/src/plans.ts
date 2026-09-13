import type { Currency } from './currency.ts';

/**
 * What Bandzen sells, and how to talk about the numbers.
 *
 * The plans are here; the amounts are not. Polar owns those — it is where a
 * price is edited, where tax behaviour is decided, and what the card is
 * actually charged from. This module knows the *shape* of the catalogue (two
 * terms, which one is featured, how many months each covers) and the
 * arithmetic we print around it.
 *
 * No product ids either. They differ between sandbox and production and belong
 * with credentials, not in a package two apps import.
 */

export const PLANS = [
  { key: 'monthly', label: 'Monthly', months: 1, featured: false },
  { key: 'quarterly', label: '3 months', months: 3, featured: true },
] as const;

export type Plan = (typeof PLANS)[number];
export type PlanKey = Plan['key'];

/** Minor units — paise, cents, pence. One table per plan, per currency. */
export type PriceTable = Record<PlanKey, Record<Currency, number>>;

/**
 * What to show when Polar cannot be reached.
 *
 * Display only. It must never reach a checkout session: those pin a currency
 * and let Polar supply the number, so a stale constant in this repo can quote
 * a wrong price for an hour but can never charge one. Keep it in step with the
 * dashboard when prices change, and treat a visible drift as a bug in the
 * cache, not in this table.
 */
export const FALLBACK_PRICE: PriceTable = {
  monthly: { INR: 149_900, USD: 1_900, GBP: 1_400, EUR: 1_600 },
  quarterly: { INR: 299_900, USD: 3_900, GBP: 2_900, EUR: 3_400 },
};

export function planByKey(key: string): Plan | null {
  return PLANS.find((plan) => plan.key === key) ?? null;
}

/**
 * Whether the founding offer is still running.
 *
 * Unset means closed, not open. The date comes from Polar's discount, and the
 * one way to not have it is for the fetch to have failed — quoting a discount
 * we cannot prove exists is the worse direction to be wrong in.
 */
export function isFoundingActive(
  endsAt: Date | null,
  now: Date = new Date(),
): boolean {
  return endsAt != null && endsAt > now;
}

export function priceOf(
  prices: PriceTable,
  plan: Plan,
  currency: Currency,
): number {
  return prices[plan.key][currency];
}

/** What the quarterly plan works out to per month, for comparison. */
export function perMonth(
  prices: PriceTable,
  plan: Plan,
  currency: Currency,
): number {
  return Math.round(priceOf(prices, plan, currency) / plan.months);
}

/** How much the longer term saves against paying monthly. 0 when it does not. */
export function savingsPercent(
  prices: PriceTable,
  plan: Plan,
  currency: Currency,
): number {
  const monthly = PLANS[0];
  if (plan.months === 1) return 0;
  const full = priceOf(prices, monthly, currency) * plan.months;
  const actual = priceOf(prices, plan, currency);
  return Math.round(((full - actual) / full) * 100);
}

const FORMATTERS: Record<Currency, Intl.NumberFormat> = {
  INR: formatter('en-IN', 'INR'),
  USD: formatter('en-US', 'USD'),
  GBP: formatter('en-GB', 'GBP'),
  EUR: formatter('en-IE', 'EUR'),
};

/**
 * The locale follows the currency, not the reader.
 *
 * The product is English throughout, so a candidate in Berlin sees "€16" and
 * not "16,00 €". `maximumFractionDigits: 0` asserts that every price is round —
 * all four currencies are 100-subunit, which is what lets one `/ 100` serve
 * them all. A price ending in non-zero minor units would silently truncate
 * here, and JPY or KWD would break the division outright.
 */
function formatter(locale: string, currency: Currency): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
}

export function formatMoney(minor: number, currency: Currency): string {
  return FORMATTERS[currency].format(minor / 100);
}

/**
 * The same money, allowed to have a decimal.
 *
 * `formatMoney` asserts that prices are round, which they are. A price divided
 * by thirty is not: a month of Pro is ₹34 a day but 47p a day, and 47p through
 * the round formatter reads "£0". This one keeps the pence when there are pence
 * and drops them when there are none.
 */
const PRECISE: Record<Currency, Intl.NumberFormat> = {
  INR: precise('en-IN', 'INR'),
  USD: precise('en-US', 'USD'),
  GBP: precise('en-GB', 'GBP'),
  EUR: precise('en-IE', 'EUR'),
};

function precise(locale: string, currency: Currency): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * What a day of Pro costs, rounded up so it is never flattering by accident.
 *
 * Rounded up *to the precision it is shown at*, which differs by currency: a
 * day is ₹50 but 47p, so rupees ceil to whole units and pence ceil to pence.
 * Ceiling the minor units alone would print "₹49.97 a day", which is accurate
 * and unreadable.
 */
export function perDay(
  prices: PriceTable,
  plan: Plan,
  currency: Currency,
): string {
  const daily = priceOf(prices, plan, currency) / (plan.months * 30);
  const rounded = daily >= 100 ? Math.ceil(daily / 100) * 100 : Math.ceil(daily);
  return PRECISE[currency].format(rounded / 100);
}
