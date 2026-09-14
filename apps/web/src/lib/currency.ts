import { cookies, headers } from 'next/headers';
import {
  currencyForCountry,
  pickCurrency,
  type Currency,
} from '@bandzen/pricing/currency';

/**
 * What to quote this visitor in.
 *
 * A deliberate near-copy of the same function in `apps/app`. Sharing six lines
 * would mean a package carrying a Next peer dependency, and the two differ
 * anyway: nobody here has a subscription to be locked to a currency, and there
 * is nothing to pick with — only a cookie set over on `app.` that follows them
 * back across the shared domain.
 */
export async function resolveCurrency(): Promise<Currency> {
  const [headerList, cookieStore] = await Promise.all([headers(), cookies()]);
  const geo = currencyForCountry(headerList.get('x-vercel-ip-country'));
  return pickCurrency(geo, cookieStore.get('bz_currency')?.value);
}
