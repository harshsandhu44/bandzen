import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import {
  ModelOutputError,
  parseStructured,
  strictJsonSchema,
} from './structured.ts';
import { writingEvaluationSchema } from './schemas.ts';

type Choice = {
  message: { content?: string | null; refusal?: string | null };
  finish_reason?: string;
};

/** Minimal stand-in; parseStructured only ever reads choices[0] and usage. */
const completion = (choice: Choice | null) =>
  ({ choices: choice ? [choice] : [] }) as never;

const ok = (content: string) =>
  completion({ message: { content }, finish_reason: 'stop' });

test('hardens every object for OpenAI strict mode', () => {
  const schema = strictJsonSchema(writingEvaluationSchema);

  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, [
    'band',
    'criteria',
    'annotations',
    'strengths',
    'weaknesses',
  ]);

  // Nested objects inside arrays must be hardened too -- strict mode rejects
  // the whole request if any one of them is missing the constraints.
  const props = schema.properties as Record<string, Record<string, unknown>>;
  const criterion = props.criteria!.items as Record<string, unknown>;
  assert.equal(criterion.additionalProperties, false);
  assert.deepEqual(criterion.required, ['name', 'band', 'comment']);
});

test('drops the dialect marker OpenAI rejects', () => {
  assert.equal(
    '$schema' in strictJsonSchema(z.object({ a: z.string() })),
    false,
  );
});

test('parses a well-formed response', () => {
  const body = {
    band: 6.5,
    criteria: [{ name: 'Task Response', band: 6, comment: 'Thin support.' }],
    annotations: [],
    strengths: ['Clear position'],
    weaknesses: ['Undeveloped examples'],
  };
  const parsed = parseStructured(
    ok(JSON.stringify(body)),
    writingEvaluationSchema,
  );
  assert.equal(parsed.band, 6.5);
  assert.equal(parsed.criteria[0]?.name, 'Task Response');
});

test('a refusal is an error, not a silent empty report', () => {
  const response = completion({
    message: { content: null, refusal: 'I cannot assess this.' },
    finish_reason: 'stop',
  });
  assert.throws(
    () => parseStructured(response, writingEvaluationSchema),
    ModelOutputError,
  );
});

test('a truncated completion is an error', () => {
  const response = completion({
    message: { content: '{"band": 6.5, "criteria": [' },
    finish_reason: 'length',
  });
  assert.throws(
    () => parseStructured(response, writingEvaluationSchema),
    ModelOutputError,
  );
});

test('an unexpected shape is an error rather than a bad cast', () => {
  assert.throws(
    () =>
      parseStructured(ok('{"band":"six and a half"}'), writingEvaluationSchema),
    ModelOutputError,
  );
});

test('no choices at all is an error', () => {
  assert.throws(
    () => parseStructured(completion(null), writingEvaluationSchema),
    ModelOutputError,
  );
});

test('emits no $ref, which strict mode could not follow', () => {
  const inner = z.object({ a: z.string() });
  // Zod inlines a reused sub-schema today. If that ever changes to $defs +
  // $ref, harden() would walk past the definitions and produce a schema
  // OpenAI rejects -- so assert the assumption rather than guarding for it.
  const json = JSON.stringify(
    strictJsonSchema(z.object({ x: inner, y: inner })),
  );
  assert.equal(json.includes('$ref'), false);
  assert.equal(json.includes('$defs'), false);
});
