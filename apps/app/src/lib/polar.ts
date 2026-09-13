import 'server-only';

import { Polar } from '@polar-sh/sdk';
import { foundingFrom, toPriceTable, type Founding } from '@bandzen/pricing/polar';
import {
  FALLBACK_PRICE,
  type PlanKey,
  type PriceTable,
} from '@bandzen/pricing/plans';

/**
 * Polar, our Merchant of Record.
 *
 * The SDK earns its dependency, which a REST wrapper would not. Polar's
 * webhooks follow the Standard Webhooks spec — HMAC over `id.timestamp.body`,
 * a base64 secret, a timestamp tolerance, and more than one valid signature at
 * a time during a rotation. A hand-rolled verifier that is subtly wrong is a
 * security bug, not a style preference.
 */

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? '',
  // Sandbox unless told otherwise. An unset variable must not quietly start
  // charging real cards.
  server: process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox',
});

export function productId(key: PlanKey): string {
  const name = `POLAR_PRODUCT_${key.toUpperCase()}`;
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export type Pricing = {
  prices: PriceTable;
  founding: Partial<Record<PlanKey, Founding>>;
};

/**
 * What things cost, and which founding discounts are still live.
 *
 * One call, so the price a page advertises and the discount a checkout applies
 * are read from the same response. Splitting them — the deadline from the API,
 * the discount id from an environment variable — is how you end up quoting a
 * price nobody is charged.
 *
 * ponytail: a module-level TTL rather than `'use cache'`, which needs
 * `cacheComponents` and this app is per-user dynamic throughout. A cold lambda
 * pays one extra request; the numbers change a few times a year.
 */
const TTL_MS = 60 * 60 * 1000;
let cached: { at: number; value: Pricing } | null = null;

export async function polarPricing(): Promise<Pricing> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  try {
    const [products, discounts] = await Promise.all([
      polar.products.list({ isArchived: false, limit: 100 }),
      polar.discounts.list({ limit: 100 }),
    ]);

    const byId = new Map(products.result.items.map((item) => [item.id, item]));
    const value: Pricing = {
      prices: toPriceTable({
        monthly: byId.get(productId('monthly')),
        quarterly: byId.get(productId('quarterly')),
      }),
      founding: foundingFrom(discounts.result.items),
    };
    cached = { at: Date.now(), value };
    return value;
  } catch (error) {
    console.error('[polar] pricing fetch failed, using fallback', error);
    // Founding reads closed on this path. Quoting a discount we cannot prove
    // exists is the worse direction to be wrong in.
    return { prices: FALLBACK_PRICE, founding: {} };
  }
}
