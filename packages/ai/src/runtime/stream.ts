import { randomUUID } from 'node:crypto';
import type {
  ChatCompletionMessageParam,
  ChatCompletionChunk,
} from 'openai/resources/chat/completions';
import { openai } from '../client.ts';
import { AI_MODELS, type AiFeature } from '../models.ts';
import { MAX_OUTPUT_TOKENS } from './limits.ts';
import { record, tokensFrom } from './usage.ts';

/**
 * A streamed model call that still lands in the ledger.
 *
 * Deliberately does **not** build the `Response`. The Coach route wraps its
 * stream in a `ReadableStream` that also carries the Tutor's CTA header and a
 * visible cut-short message; a gateway that owned that would need a `headers`
 * option and an `onAction` callback, and would have stopped being a gateway.
 * It hands back text and a `finish()`, and the route keeps its own shape.
 *
 * The usage chunk arrives last and carries no delta, so it only exists if the
 * reader stayed to the end. A reader that aborts leaves real spend unmeasured;
 * `finish()` writes the row anyway, saying so, because a call missing from the
 * ledger is indistinguishable from a call that never happened.
 */
export async function runAIStream(options: {
  feature: AiFeature;
  messages: ChatCompletionMessageParam[];
  model?: string;
  maxOutputTokens?: number;
  record?: boolean;
  userId?: string | null;
  attemptId?: string | null;
}): Promise<{
  /** Text deltas. The usage chunk is consumed here, not yielded. */
  stream: AsyncIterable<string>;
  /** Resolves once the row is written. Hand this to `after()` so the function outlives the stream. */
  done: Promise<void>;
  /**
   * Call in a `finally`, however the read ended. Idempotent — a stream that
   * both errors and then closes must not write two rows.
   */
  finish: (errorCode?: string | null) => void;
  model: string;
  traceId: string;
}> {
  const model = options.model ?? AI_MODELS[options.feature];
  const maxTokens =
    options.maxOutputTokens ?? MAX_OUTPUT_TOKENS[options.feature];
  const traceId = randomUUID();
  const started = Date.now();

  const raw = await openai().chat.completions.create({
    model,
    stream: true,
    // The usage chunk arrives last and carries no delta, so it costs nothing
    // to ask for — and without it this is the one recurring call whose spend
    // cannot be measured at all.
    stream_options: { include_usage: true },
    max_completion_tokens: maxTokens,
    messages: options.messages,
  });

  let usage: ChatCompletionChunk['usage'];
  let settle: () => void;
  const done = new Promise<void>((resolve) => {
    settle = resolve;
  });
  let finished = false;

  const finish = (errorCode?: string | null) => {
    if (finished) return;
    finished = true;
    void record(
      {
        feature: options.feature,
        model,
        requestId: null,
        traceId,
        ...tokensFrom(usage ?? undefined),
        toolCalls: 0,
        latencyMs: Date.now() - started,
        // The call itself succeeded — tokens were spent and the reader saw
        // text. What failed is our sight of it, which is why the status stays
        // 'ok' and the error code carries the reason the row is thin. Cost
        // lands null rather than zero: SUM() then understates by an amount
        // `ai-cost.mts` can count and show, instead of lying quietly.
        status: errorCode && errorCode !== 'aborted' ? 'failed' : 'ok',
        errorCode: errorCode ?? (usage ? null : 'aborted'),
        userId: options.userId,
        attemptId: options.attemptId,
      },
      options.record,
    ).finally(() => settle());
  };

  async function* stream() {
    for await (const chunk of raw) {
      if (chunk.usage) usage = chunk.usage;
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield text;
    }
  }

  return { stream: stream(), done, finish, model, traceId };
}
