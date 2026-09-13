import 'server-only';

import { cookies, headers } from 'next/headers';
import {
  currencyForCountry,
  pickCurrency,
  type Currency,
} from '@bandzen/pricing/currency';

/** Where a candidate's currency preference is remembered. */
export const CURRENCY_COOKIE = 'bz_currency';

/**
 * What to quote this request in, and what location says.
 *
 * Both, because they answer different questions: `currency` is what to print,
 * `geo` is what the picker may offer. Deliberately not a server action and
 * never an argument from the browser — the browser's only say is the cookie,
 * and `pickCurrency` decides what that is allowed to mean.
 */
export async function resolveCurrency(): Promise<{
  currency: Currency;
  geo: Currency;
}> {
  const [headerList, cookieStore] = await Promise.all([headers(), cookies()]);
  const geo = currencyForCountry(headerList.get('x-vercel-ip-country'));
  return {
    geo,
    currency: pickCurrency(geo, cookieStore.get(CURRENCY_COOKIE)?.value),
  };
}

const ROOT_DOMAIN = 'bandzen.com';

/**
 * Scoped across subdomains, so a choice made on `/upgrade` follows the
 * candidate back to the marketing site.
 *
 * Host-only on localhost and preview deployments, where a `.bandzen.com`
 * cookie would simply be dropped. The same split posthog-js already makes.
 */
export async function currencyCookieOptions(): Promise<{
  path: string;
  maxAge: number;
  sameSite: 'lax';
  domain?: string;
}> {
  const host = (await headers()).get('host')?.split(':')[0] ?? '';
  const shared = host === ROOT_DOMAIN || host.endsWith(`.${ROOT_DOMAIN}`);
  return {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    ...(shared ? { domain: `.${ROOT_DOMAIN}` } : {}),
  };
}

/**
 * Where to send Polar's embedded checkout back to.
 *
 * Polar refuses to render the iframe unless `embed_origin` matches the page
 * hosting it, so this has to follow the request rather than be configured —
 * localhost, every preview URL and production all need to work.
 */
export async function embedOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get('host') ?? '';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

/** The candidate's IP, for Polar's tax and fraud checks — not for currency. */
export async function clientIp(): Promise<string | undefined> {
  const forwarded = (await headers()).get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || undefined;
}
