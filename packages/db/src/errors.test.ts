import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ContentInUseError,
  guardSatContent,
  satContentMessage,
} from './errors.ts';

const pg = (code: string, message = 'pg says no') =>
  Object.assign(new Error(message), { code });
const wrapped = (cause: Error) =>
  new Error('Failed query: update …', { cause });

test('finds the sat-content refusal under a Drizzle wrapper', () => {
  assert.equal(satContentMessage(wrapped(pg('BZ001', 'sat'))), 'sat');
});

test('maps a restrict violation to a delete message', () => {
  assert.match(satContentMessage(wrapped(pg('23503')))!, /cannot be deleted/);
});

test('ignores unrelated failures', () => {
  assert.equal(satContentMessage(wrapped(pg('23505'))), null);
  assert.equal(satContentMessage('nope'), null);
});

test('guardSatContent rethrows as ContentInUseError, and passes others through', async () => {
  await assert.rejects(
    guardSatContent(Promise.reject(wrapped(pg('BZ001', 'sat')))),
    ContentInUseError,
  );
  const other = pg('23505');
  await assert.rejects(
    guardSatContent(Promise.reject(other)),
    (e) => e === other,
  );
});
