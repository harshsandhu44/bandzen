import assert from 'node:assert/strict';
import test from 'node:test';
import { campaignParams } from './campaign.ts';

test('campaignParams reads a social campaign URL', () => {
  assert.deepEqual(
    campaignParams(
      'https://bandzen.com/?utm_source=instagram&utm_medium=social&utm_campaign=instagram_bio',
    ),
    {
      utm_source: 'instagram',
      utm_medium: 'social',
      utm_campaign: 'instagram_bio',
    },
  );
});

test('campaignParams omits absent and empty params', () => {
  assert.deepEqual(campaignParams('https://bandzen.com/about'), {});
  assert.deepEqual(campaignParams('https://bandzen.com/?utm_source='), {});
});

test('campaignParams picks up click ids', () => {
  assert.deepEqual(campaignParams('https://bandzen.com/?fbclid=abc123'), {
    fbclid: 'abc123',
  });
});

test('campaignParams returns nothing for an unparseable URL', () => {
  assert.deepEqual(campaignParams('not a url'), {});
  assert.deepEqual(campaignParams(''), {});
});
