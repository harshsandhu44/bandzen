import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { TUTOR_SCHEMAS } from './tutor-schemas.ts';

/**
 * The Tutor's tools are read-only and user-scoped, and the scoping works
 * because each tool closes over the authenticated userId. That guarantee dies
 * the moment a schema grows a field the model can set, so check it here rather
 * than hope a reviewer spots it.
 */

/** Every field name anywhere in a schema, nested objects included. */
function fieldNames(schema: z.ZodType, seen = new Set<string>()): Set<string> {
  const shape =
    schema instanceof z.ZodObject
      ? (schema.shape as Record<string, z.ZodType>)
      : null;
  if (!shape) return seen;
  for (const [name, child] of Object.entries(shape)) {
    seen.add(name);
    fieldNames(child, seen);
  }
  return seen;
}

const FORBIDDEN = /user|account|clerk|owner|tenant|customer|subscri/i;

test('no tool lets the model name a user', () => {
  for (const [toolName, schema] of Object.entries(TUTOR_SCHEMAS)) {
    for (const field of fieldNames(schema)) {
      assert.ok(
        !FORBIDDEN.test(field),
        `${toolName} exposes "${field}" — user scoping must come from the closure, never a model-chosen argument`,
      );
    }
  }
});

test('every tool is still covered by this check', () => {
  // Guards the check itself: a fourth tool added without a schema here would
  // otherwise pass silently by not being looked at.
  assert.deepEqual(Object.keys(TUTOR_SCHEMAS).sort(), [
    'find_lesson',
    'find_practice',
    'get_today_plan',
  ]);
});

test('find_practice only accepts real IELTS question kinds', () => {
  const ok = TUTOR_SCHEMAS.find_practice.safeParse({
    skill: 'reading',
    questionKind: 'matching_headings',
  });
  assert.ok(ok.success);

  // A kind the catalogue cannot filter on would silently return everything.
  const bad = TUTOR_SCHEMAS.find_practice.safeParse({
    skill: 'reading',
    questionKind: 'essay_vibes',
  });
  assert.ok(!bad.success);
});

test('speaking is not offerable — nothing in the catalogue drills it', () => {
  assert.ok(
    !TUTOR_SCHEMAS.find_practice.safeParse({
      skill: 'speaking',
      questionKind: null,
    }).success,
  );
});
