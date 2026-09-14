import { Polar } from '@polar-sh/sdk';
import { unstable_cacheLife as cacheLife } from 'next/cache';
import {
  foundingFrom,
  toPriceTable,
  type Founding,
} from '@bandzen/pricing/polar';
import {
  FALLBACK_PRICE,
  type PlanKey,
  type PriceTable,
} from '@bandzen/pricing/plans';

/**
 * Prices, read from Polar, for a site that only ever displays them.
 *
 * The token here is read-only on purpose — scope it to products and discounts
 * and nothing else. The marketing site is the most exposed surface we have and
 * has no business holding a credential that can create a checkout or read a
 * customer.
 */

const polar = new Polar({
  accessToken: process.env.POLAR_READ_TOKEN ?? '',
  server: process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox',
});

export type Pricing = {
  prices: PriceTable;
  founding: Partial<Record<PlanKey, Founding>>;
};

export async function polarPricing(): Promise<Pricing> {
  'use cache';
  cacheLife('hours');

  try {
    const [products, discounts] = await Promise.all([
      polar.products.list({ isArchived: false, limit: 100 }),
      polar.discounts.list({ limit: 100 }),
    ]);

    const byId = new Map(products.result.items.map((item) => [item.id, item]));
    return {
      prices: toPriceTable({
        monthly: byId.get(process.env.POLAR_PRODUCT_MONTHLY ?? ''),
        quarterly: byId.get(process.env.POLAR_PRODUCT_QUARTERLY ?? ''),
      }),
      founding: foundingFrom(discounts.result.items),
    };
  } catch (error) {
    // A landing page with no price on it is worse than one with an hour-old
    // price, so this falls back rather than throwing. Founding reads closed:
    // advertising a discount we cannot prove exists is the worse mistake.
    console.error('[polar] pricing fetch failed, using fallback', error);
    return { prices: FALLBACK_PRICE, founding: {} };
  }
}
