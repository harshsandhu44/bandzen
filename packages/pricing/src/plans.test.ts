import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  FALLBACK_PRICE,
  PLANS,
  formatMoney,
  isFoundingActive,
  perDay,
  perMonth,
  planByKey,
  priceOf,
  savingsPercent,
} from './plans.ts';
import { CURRENCIES } from './currency.ts';

const [monthly, quarterly] = PLANS;

describe('planByKey', () => {
  it('finds a plan, or nothing', () => {
    assert.equal(planByKey('quarterly'), quarterly);
    assert.equal(planByKey('yearly'), null);
    assert.equal(planByKey(''), null);
  });
});

describe('isFoundingActive', () => {
  it('treats an unset deadline as closed, not open', () => {
    assert.equal(isFoundingActive(null), false);
  });

  it('is open before the deadline and closed after', () => {
    const now = new Date('2026-09-13T00:00:00Z');
    assert.equal(isFoundingActive(new Date('2026-10-31T00:00:00Z'), now), true);
    assert.equal(
      isFoundingActive(new Date('2026-08-31T00:00:00Z'), now),
      false,
    );
  });
});

describe('FALLBACK_PRICE', () => {
  it('covers every plan in every currency', () => {
    for (const plan of PLANS) {
      for (const currency of CURRENCIES) {
        const price = priceOf(FALLBACK_PRICE, plan, currency);
        assert.ok(
          Number.isSafeInteger(price) && price > 0,
          `${plan.key}/${currency} is not a positive integer`,
        );
        // Every price is round in minor units, which is what lets
        // `maximumFractionDigits: 0` be honest.
        assert.equal(
          price % 100,
          0,
          `${plan.key}/${currency} has odd minor units`,
        );
      }
    }
  });
});

describe('perMonth', () => {
  it('divides the longer term across its months', () => {
    assert.equal(perMonth(FALLBACK_PRICE, quarterly, 'GBP'), 967);
    assert.equal(perMonth(FALLBACK_PRICE, monthly, 'GBP'), 1_400);
  });
});

describe('savingsPercent', () => {
  it('is zero for the monthly plan, which saves nothing', () => {
    assert.equal(savingsPercent(FALLBACK_PRICE, monthly, 'INR'), 0);
  });

  it('compares the term against three months of monthly', () => {
    // 3 × 1400 = 4200, charged 2900.
    assert.equal(savingsPercent(FALLBACK_PRICE, quarterly, 'GBP'), 31);
    // 3 × 149900 = 449700, charged 299900.
    assert.equal(savingsPercent(FALLBACK_PRICE, quarterly, 'INR'), 33);
  });
});

describe('perDay', () => {
  it('rounds up, so it is never flattering by accident', () => {
    // 149900 / 30 = 4996.67 paise → ₹50.
    assert.equal(perDay(FALLBACK_PRICE, monthly, 'INR'), '₹50');
  });

  it('keeps the minor units when a day costs less than one major unit', () => {
    // 1400 / 30 = 46.67p → 47p. The round formatter would say "£0".
    assert.equal(perDay(FALLBACK_PRICE, monthly, 'GBP'), '£0.47');
    assert.equal(perDay(FALLBACK_PRICE, monthly, 'USD'), '$0.64');
  });
});

describe('formatMoney', () => {
  it('follows the currency, not the reader', () => {
    assert.equal(formatMoney(149_900, 'INR'), '₹1,499');
    assert.equal(formatMoney(1_900, 'USD'), '$19');
    assert.equal(formatMoney(1_400, 'GBP'), '£14');
    assert.equal(formatMoney(1_600, 'EUR'), '€16');
  });
});
