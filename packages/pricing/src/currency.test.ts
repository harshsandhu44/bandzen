import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  asCurrency,
  currencyForCountry,
  overridesFor,
  pickCurrency,
} from './currency.ts';

describe('currencyForCountry', () => {
  it('maps the three named markets', () => {
    assert.equal(currencyForCountry('IN'), 'INR');
    assert.equal(currencyForCountry('GB'), 'GBP');
    assert.equal(currencyForCountry('DE'), 'EUR');
  });

  it('sends the rest of the world to dollars', () => {
    assert.equal(currencyForCountry('NG'), 'USD');
    assert.equal(currencyForCountry('AU'), 'USD');
    // In the EU, not in the eurozone.
    assert.equal(currencyForCountry('SE'), 'USD');
    assert.equal(currencyForCountry('PL'), 'USD');
  });

  it('falls back to dollars when there is no header', () => {
    assert.equal(currencyForCountry(null), 'USD');
    assert.equal(currencyForCountry(undefined), 'USD');
    assert.equal(currencyForCountry(''), 'USD');
  });
});

describe('asCurrency', () => {
  it('accepts the four we sell in', () => {
    assert.equal(asCurrency('INR'), 'INR');
    assert.equal(asCurrency('EUR'), 'EUR');
  });

  it('refuses anything else', () => {
    assert.equal(asCurrency('inr'), null);
    assert.equal(asCurrency('JPY'), null);
    assert.equal(asCurrency('; drop table'), null);
    assert.equal(asCurrency(null), null);
    assert.equal(asCurrency(undefined), null);
  });
});

describe('pickCurrency', () => {
  it('refuses rupees to anyone outside India', () => {
    // The one that matters. A GB visitor asking for INR is asking for a 65%
    // discount, and must be quoted pounds anyway.
    assert.equal(pickCurrency('GBP', 'INR'), 'GBP');
    assert.equal(pickCurrency('USD', 'INR'), 'USD');
    assert.equal(pickCurrency('EUR', 'INR'), 'EUR');
  });

  it('lets India keep rupees', () => {
    assert.equal(pickCurrency('INR', 'INR'), 'INR');
  });

  it('honours a swap between the three hard currencies', () => {
    assert.equal(pickCurrency('GBP', 'USD'), 'USD');
    assert.equal(pickCurrency('EUR', 'GBP'), 'GBP');
    // Someone in India who would rather pay in dollars may.
    assert.equal(pickCurrency('INR', 'USD'), 'USD');
  });

  it('ignores junk and falls back to location', () => {
    assert.equal(pickCurrency('GBP', 'inr'), 'GBP');
    assert.equal(pickCurrency('GBP', 'JPY'), 'GBP');
    assert.equal(pickCurrency('GBP', ''), 'GBP');
    assert.equal(pickCurrency('GBP', null), 'GBP');
    assert.equal(pickCurrency('GBP', undefined), 'GBP');
  });
});

describe('overridesFor', () => {
  it('offers rupees only where they are granted', () => {
    assert.deepEqual([...overridesFor('INR')], ['INR', 'USD', 'GBP', 'EUR']);
    assert.deepEqual([...overridesFor('GBP')], ['USD', 'GBP', 'EUR']);
  });

  it('never offers what pickCurrency would refuse', () => {
    for (const geo of ['USD', 'GBP', 'EUR', 'INR'] as const) {
      for (const option of overridesFor(geo)) {
        assert.equal(
          pickCurrency(geo, option),
          option,
          `${geo} was offered ${option} and would not get it`,
        );
      }
    }
  });
});
