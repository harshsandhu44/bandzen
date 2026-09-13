import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FALLBACK_PRICE } from './plans.ts';
import {
  foundingFrom,
  foundingPrice,
  toPriceTable,
  type PolarProduct,
} from './polar.ts';

const monthly: PolarProduct = {
  id: 'prod_m',
  prices: [
    { priceCurrency: 'inr', priceAmount: 149_900 },
    { priceCurrency: 'gbp', priceAmount: 1_400 },
    { priceCurrency: 'usd', priceAmount: 1_900 },
    { priceCurrency: 'eur', priceAmount: 1_600 },
  ],
};

describe('toPriceTable', () => {
  it('reads Polar prices, matching currency case-insensitively', () => {
    const table = toPriceTable({ monthly });
    assert.equal(table.monthly.GBP, 1_400);
    assert.equal(table.monthly.INR, 149_900);
  });

  it('falls back per currency rather than throwing', () => {
    const partial: PolarProduct = {
      id: 'prod_m',
      prices: [{ priceCurrency: 'gbp', priceAmount: 1_200 }],
    };
    const table = toPriceTable({ monthly: partial });
    assert.equal(table.monthly.GBP, 1_200);
    assert.equal(table.monthly.EUR, FALLBACK_PRICE.monthly.EUR);
  });

  it('falls back entirely when a product is missing', () => {
    assert.deepEqual(toPriceTable({}), FALLBACK_PRICE);
  });

  it('refuses a price that is not a positive integer', () => {
    const broken: PolarProduct = {
      id: 'prod_m',
      prices: [
        { priceCurrency: 'gbp', priceAmount: 0 },
        { priceCurrency: 'eur', priceAmount: null },
        { priceCurrency: 'usd', priceAmount: 19.5 },
      ],
    };
    const table = toPriceTable({ monthly: broken });
    assert.equal(table.monthly.GBP, FALLBACK_PRICE.monthly.GBP);
    assert.equal(table.monthly.EUR, FALLBACK_PRICE.monthly.EUR);
    assert.equal(table.monthly.USD, FALLBACK_PRICE.monthly.USD);
  });
});

describe('foundingFrom', () => {
  const now = new Date('2026-09-13T00:00:00Z');
  const endsAt = new Date('2026-10-31T00:00:00Z');
  const live = [
    { id: 'd_m', code: 'FOUNDING_MONTHLY', endsAt, amounts: { inr: 50_000 } },
    {
      id: 'd_q',
      code: 'FOUNDING_QUARTERLY',
      endsAt,
      amounts: { inr: 100_000 },
    },
  ];

  it('returns one discount per plan, with what it takes off', () => {
    const found = foundingFrom(live, now);
    assert.deepEqual(found.monthly, { id: 'd_m', endsAt, off: { INR: 50_000 } });
    assert.deepEqual(found.quarterly, {
      id: 'd_q',
      endsAt,
      off: { INR: 100_000 },
    });
  });

  it('ignores an expired discount', () => {
    const expired = live.map((d) => ({
      ...d,
      endsAt: new Date('2026-08-01T00:00:00Z'),
    }));
    assert.deepEqual(foundingFrom(expired, now), {});
  });

  it('ignores one with no deadline — an offer is defined by having an end', () => {
    assert.deepEqual(
      foundingFrom([{ id: 'd', code: 'FOUNDING_MONTHLY' }], now),
      {},
    );
  });

  it('ignores every other discount, and an empty list', () => {
    assert.deepEqual(
      foundingFrom([{ id: 'd', code: 'BLACKFRIDAY', endsAt }], now),
      {},
    );
    assert.deepEqual(foundingFrom([], now), {});
  });

  it('drops a currency it cannot read, rather than the whole discount', () => {
    const messy = [
      {
        id: 'd_m',
        code: 'FOUNDING_MONTHLY',
        endsAt,
        amounts: { inr: 50_000, jpy: 500, gbp: 0 },
      },
    ];
    assert.deepEqual(foundingFrom(messy, now).monthly?.off, { INR: 50_000 });
  });
});

describe('foundingPrice', () => {
  const endsAt = new Date('2026-10-31T00:00:00Z');
  const founding = { id: 'd_m', endsAt, off: { INR: 50_000 } };

  it('takes the discount off in a currency the offer reaches', () => {
    assert.equal(foundingPrice(149_900, founding, 'INR'), 99_900);
  });

  it('leaves every other currency at the standard price', () => {
    assert.equal(foundingPrice(1_400, founding, 'GBP'), 1_400);
  });

  it('is the standard price when there is no offer', () => {
    assert.equal(foundingPrice(149_900, undefined, 'INR'), 149_900);
  });

  it('floors at zero rather than going negative', () => {
    const huge = { id: 'd', endsAt, off: { INR: 999_999 } };
    assert.equal(foundingPrice(149_900, huge, 'INR'), 0);
  });
});
