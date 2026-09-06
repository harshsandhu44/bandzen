import assert from 'node:assert/strict';
import test from 'node:test';
import { CONSENT_VERSION, parseConsent, serializeConsent } from './consent.ts';

test('parseConsent treats a missing cookie as undecided', () => {
  assert.equal(parseConsent(undefined), null);
  assert.equal(parseConsent(''), null);
  assert.equal(parseConsent(null), null);
});

test('parseConsent reads a current-version cookie', () => {
  assert.deepEqual(parseConsent(`{"v":${CONSENT_VERSION},"a":1,"m":0,"t":0}`), {
    analytics: true,
    marketing: false,
  });
});

test('parseConsent rejects a stale version so the banner returns', () => {
  assert.equal(parseConsent('{"v":0,"a":1,"m":1,"t":0}'), null);
});

test('parseConsent swallows malformed JSON', () => {
  assert.equal(parseConsent('not json'), null);
});

test('serializeConsent round-trips through parseConsent', () => {
  const state = { analytics: true, marketing: true };
  const cookie = serializeConsent(state);
  const value = cookie.slice(cookie.indexOf('=') + 1, cookie.indexOf(';'));
  assert.deepEqual(parseConsent(value), state);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /path=\//);
});
