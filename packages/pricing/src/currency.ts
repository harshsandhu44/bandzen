/**
 * Which currency a candidate is quoted and charged in.
 *
 * Polar can geolocate this itself, but it does so when a checkout session is
 * created — long after the price has been printed on a page. Deciding here
 * means the number advertised and the number charged come from one rule, and
 * the rule is pure enough to test without a request.
 */

export const CURRENCIES = ['INR', 'USD', 'GBP', 'EUR'] as const;

export type Currency = (typeof CURRENCIES)[number];

/**
 * The eurozone, not the EU and not Europe. Sweden, Poland and Denmark are in
 * the EU and do not use the euro; Montenegro uses it and is in neither.
 */
const EUROZONE = new Set([
  'AT',
  'BE',
  'HR',
  'CY',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PT',
  'SK',
  'SI',
  'ES',
]);

/**
 * An ISO 3166-1 alpha-2 country code to the currency we quote there.
 *
 * USD is the fallback rather than INR, including when the header is missing.
 * Someone we cannot place is more likely to be anywhere than to be in India,
 * and the rupee price is the one worth protecting.
 */
export function currencyForCountry(code: string | null | undefined): Currency {
  if (!code) return 'USD';
  if (code === 'IN') return 'INR';
  if (code === 'GB') return 'GBP';
  return EUROZONE.has(code) ? 'EUR' : 'USD';
}

/** Narrows a string of unknown provenance, or refuses it. */
export function asCurrency(value: string | null | undefined): Currency | null {
  return CURRENCIES.includes(value as Currency) ? (value as Currency) : null;
}

/**
 * What the visitor may override their location with.
 *
 * An allowlist alone is not enough here: `INR` passes one, and the rupee price
 * is around a third of the dollar price, so accepting any valid currency from a
 * cookie would be selling Pro at a 65% discount to anyone who typed four
 * letters. The rupee is therefore granted by location and never by request.
 *
 * USD, GBP and EUR sit within a fifth of each other, so swapping between them
 * is a preference, not arbitrage, and is allowed.
 */
export function pickCurrency(
  geo: Currency,
  rawOverride: string | null | undefined,
): Currency {
  const override = asCurrency(rawOverride);
  if (!override) return geo;
  if (override === 'INR' && geo !== 'INR') return geo;
  return override;
}

/** What the picker offers. Mirrors `pickCurrency`, so it cannot offer a lie. */
export function overridesFor(geo: Currency): readonly Currency[] {
  return geo === 'INR' ? CURRENCIES : CURRENCIES.filter((c) => c !== 'INR');
}
