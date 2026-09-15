import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';
import { openai } from '../client.ts';
import { AI_MODELS, type AiFeature } from '../models.ts';
import {
  createStructured,
  parseStructured,
  strictJsonSchema,
} from '../structured.ts';
import { MAX_OUTPUT_TOKENS } from './limits.ts';
import { record, tokensFrom, type AiTelemetry } from './usage.ts';

/**
 * The one way this codebase calls a model.
 *
 * Before this, five call sites each owned their own timeout, token cap and log
 * line, and what any of it cost was a grep over Vercel logs. The point is not
 * abstraction for its own sake — it is that `feature` decides the model, the
 * output bound and the ledger row together, so adding a call site cannot
 * quietly add an unmeasured one.
 *
 * `record` defaults **off**. See `usage.ts` for why that default is what keeps
 * `eval-grader.mts` safe to point at production.
 */

export type RunOptions<T> = {
  feature: AiFeature;
  messages: ChatCompletionMessageParam[];
  schema: z.ZodType<T>;
  /**
   * Present → strict Structured Outputs under this name. Absent → no
   * `response_format` at all, which is the only thing the audio graders
   * accept; their shape is prose in the prompt and nothing enforces it.
   */
  schemaName?: string;
  /** Overrides `AI_MODELS[feature]`. For the eval harnesses, which sweep models. */
  model?: string;
  maxOutputTokens?: number;
  /**
   * Pin it. `gpt-5.4-mini` defaults to `'none'` and every gpt-5.6 model to
   * `'medium'`, so leaving it unset compares different amounts of thinking —
   * and reasoning tokens bill as output.
   */
  reasoningEffort?: 'none' | 'low' | 'medium' | 'high';
  modalities?: ('text' | 'audio')[];
  /** Retry once when a prose-only JSON contract is broken (#74/#75). */
  retryOnParseFailure?: boolean;
  onRetry?: (error: unknown) => void;
  /**
   * Fires after each physical call with that call's request id. Lets a caller
   * name the request in its own logs even when a later try throws — which is
   * exactly when the id is worth having.
   */
  onCall?: (requestId: string | null) => void;
  /** Off by default. Only production call sites opt in. */
  record?: boolean;
  userId?: string | null;
  attemptId?: string | null;
};

export type RunResult<T> = {
  data: T;
  model: string;
  /** Of the last physical call, so a retry names the request that answered. */
  requestId: string | null;
  traceId: string;
  response: ChatCompletion;
  tries: number;
  latencyMs: number;
};

export async function runAI<T>(options: RunOptions<T>): Promise<RunResult<T>> {
  const model = options.model ?? AI_MODELS[options.feature];
  const maxTokens =
    options.maxOutputTokens ?? MAX_OUTPUT_TOKENS[options.feature];

  let requestId: string | null = null;
  let traceId = '';
  let latencyMs = 0;

  /**
   * One physical HTTP call, one ledger row — so #75's retry writes two rows
   * rather than hiding the second call's spend inside the first's. The retry
   * rate then falls out of the data instead of needing its own counter.
   */
  const call = async (): Promise<ChatCompletion> => {
    const callTrace = randomUUID();
    const started = Date.now();
    const base: Omit<
      AiTelemetry,
      | 'requestId'
      | 'inputTokens'
      | 'cachedInputTokens'
      | 'outputTokens'
      | 'reasoningTokens'
      | 'audioInputTokens'
      | 'latencyMs'
      | 'status'
      | 'errorCode'
    > = {
      feature: options.feature,
      model,
      traceId: callTrace,
      toolCalls: 0,
      userId: options.userId,
      attemptId: options.attemptId,
    };

    try {
      const response = await openai().chat.completions.create({
        model,
        messages: options.messages,
        max_completion_tokens: maxTokens,
        ...(options.reasoningEffort
          ? { reasoning_effort: options.reasoningEffort }
          : {}),
        ...(options.modalities ? { modalities: options.modalities } : {}),
        ...(options.schemaName
          ? {
              response_format: {
                type: 'json_schema' as const,
                json_schema: {
                  name: options.schemaName,
                  strict: true,
                  schema: strictJsonSchema(options.schema),
                },
              },
            }
          : {}),
      });

      requestId = response._request_id ?? null;
      traceId = callTrace;
      latencyMs = Date.now() - started;
      options.onCall?.(requestId);

      await record(
        {
          ...base,
          ...tokensFrom(response.usage),
          requestId,
          latencyMs,
          status: 'ok',
          errorCode: null,
        },
        options.record,
      );
      return response;
    } catch (error) {
      traceId = callTrace;
      latencyMs = Date.now() - started;
      await record(
        {
          ...base,
          inputTokens: 0,
          cachedInputTokens: 0,
          outputTokens: 0,
          reasoningTokens: 0,
          audioInputTokens: null,
          requestId: null,
          latencyMs,
          status: 'failed',
          errorCode: errorCode(error),
        },
        options.record,
      );
      throw error;
    }
  };

  const { response, parsed, tries } = options.retryOnParseFailure
    ? await createStructured(call, options.schema, options.onRetry ?? noop)
    : await (async () => {
        const first = await call();
        return {
          response: first,
          parsed: parseStructured(first, options.schema),
          tries: 1,
        };
      })();

  return {
    data: parsed,
    model,
    requestId,
    traceId,
    response,
    tries,
    latencyMs,
  };
}

function noop() {}

/** Enough to tell a 429 from a timeout from a bad schema, without storing the message. */
export function errorCode(error: unknown): string {
  if (error && typeof error === 'object') {
    const status = (error as { status?: number }).status;
    if (typeof status === 'number') return `http_${status}`;
    const name = (error as { name?: string }).name;
    if (name) return name;
  }
  return 'unknown';
}
