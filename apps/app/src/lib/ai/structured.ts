import { z } from 'zod';
import type { ChatCompletion } from 'openai/resources/chat/completions';

// Deliberately not `server-only`: this module holds no key and touches no
// database, and keeping it importable under `node --test` is what lets the
// schema hardening below have a test at all.

/**
 * The single place a model's JSON becomes a typed value.
 *
 * Two jobs, and the second is the one worth having. Strict Structured Outputs
 * already guarantees the *shape* of a successful response, so parsing rarely
 * catches a wrong field — but a refusal or a length-truncated completion comes
 * back as a well-formed message with no usable JSON in it, and a bare
 * `JSON.parse(raw) as T` turns that into a plausible-looking object that fails
 * much later, somewhere less obvious.
 */

/**
 * Zod → the JSON Schema dialect OpenAI's strict mode accepts.
 *
 * Strict mode requires every property listed in `required` and
 * `additionalProperties: false` on every object. Zod emits neither by default
 * for optional fields, so the rule is: model optionality as `.nullable()`, not
 * `.optional()`, and this function asserts the rest.
 */
export function strictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
  }) as Record<string, unknown>;
  // OpenAI rejects the dialect marker Zod adds at the root.
  delete json.$schema;
  return harden(json);
}

function harden(node: Record<string, unknown>): Record<string, unknown> {
  if (node.type === 'object' && node.properties) {
    const properties = node.properties as Record<
      string,
      Record<string, unknown>
    >;
    for (const key of Object.keys(properties)) harden(properties[key]!);
    node.additionalProperties = false;
    node.required = Object.keys(properties);
  }
  if (node.type === 'array' && node.items) {
    harden(node.items as Record<string, unknown>);
  }
  // `.nullable()` becomes an anyOf wrapper, so an object can hide one level
  // deeper than the type checks above reach.
  for (const key of ['anyOf', 'oneOf', 'allOf'] as const) {
    const branches = node[key];
    if (Array.isArray(branches)) {
      for (const branch of branches) harden(branch as Record<string, unknown>);
    }
  }
  return node;
}

export class ModelOutputError extends Error {}

/**
 * Pull the one JSON message out of a completion and validate it.
 *
 * Throws rather than returning a result type: every caller is already inside a
 * try/catch that has to leave the attempt at a terminal status, and a second
 * error channel would just be a second thing to forget to check.
 */
export function parseStructured<T>(
  response: ChatCompletion,
  schema: z.ZodType<T>,
): T {
  const choice = response.choices[0];
  if (!choice) throw new ModelOutputError('No completion returned');

  if (choice.message.refusal) {
    throw new ModelOutputError(`Model refused: ${choice.message.refusal}`);
  }
  if (choice.finish_reason === 'length') {
    throw new ModelOutputError('Response truncated before the JSON closed');
  }

  const raw = choice.message.content;
  if (!raw) throw new ModelOutputError('Completion carried no content');

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ModelOutputError('Completion was not valid JSON');
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ModelOutputError(
      `Response failed validation: ${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}
