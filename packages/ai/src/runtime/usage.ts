import type { CompletionUsage } from 'openai/resources/completions';
import type { AiFeature } from '../models.ts';
import { PRICING_VERSION, estimateCost } from './pricing.ts';

/**
 * What one model call cost, in tokens, milliseconds and dollars.
 *
 * Metadata only. Nothing here holds a prompt, a completion, or a word the
 * candidate wrote — `ai_usage` is a spend ledger, not a transcript, and the
 * moment it holds student text it inherits a retention policy it should not
 * have.
 */
export type AiTelemetry = {
  feature: AiFeature;
  model: string;
  /** The provider's, where it gives one. The Agents SDK does not. */
  requestId: string | null;
  /** Ours, always set, so no call is unidentifiable. */
  traceId: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  audioInputTokens: number | null;
  toolCalls: number;
  latencyMs: number;
  status: 'ok' | 'failed';
  errorCode: string | null;
  userId?: string | null;
  attemptId?: string | null;
};

/** Pull the token counts out of a completion's usage block. */
export function tokensFrom(usage: CompletionUsage | undefined) {
  return {
    inputTokens: usage?.prompt_tokens ?? 0,
    cachedInputTokens: usage?.prompt_tokens_details?.cached_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
    reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens ?? 0,
    audioInputTokens: usage?.prompt_tokens_details?.audio_tokens ?? null,
  };
}

/**
 * Write one `ai_usage` row.
 *
 * **Never throws, never rejects.** Telemetry failing must not fail a grade —
 * the same contract `apps/app/src/lib/analytics.ts` holds for PostHog, for the
 * same reason.
 *
 * `on` defaults to off, and that default is load-bearing rather than cautious.
 * `@bandzen/db/client` is `import 'server-only'`, which resolves to a module
 * that throws on import under every condition except `react-server` — so the
 * dynamic import below *will* throw in the seven `.mts` scripts that import
 * this package under plain node. They never pass `record`, so they never reach
 * it; and if one ever did, the throw lands in the catch here and is logged
 * rather than taking the script down. That is also what keeps
 * `eval-grader.mts` safe to point at production: it cannot write, by
 * construction, not by remembering a flag.
 *
 * Returns a promise so a caller already inside `after()` can await the write
 * instead of racing the function's shutdown; awaiting it costs no user-visible
 * latency on any current path.
 */
export async function record(
  telemetry: AiTelemetry,
  on: boolean | undefined,
  /** Transcription is priced per minute, so its cost arrives precomputed. */
  costOverride?: number | null,
): Promise<void> {
  if (!on) return;
  try {
    const [{ db }, { aiUsage }] = await Promise.all([
      import('@bandzen/db/client'),
      import('@bandzen/db/schema'),
    ]);
    await db.insert(aiUsage).values({
      userId: telemetry.userId ?? null,
      attemptId: telemetry.attemptId ?? null,
      feature: telemetry.feature,
      model: telemetry.model,
      requestId: telemetry.requestId,
      traceId: telemetry.traceId,
      inputTokens: telemetry.inputTokens,
      cachedInputTokens: telemetry.cachedInputTokens,
      outputTokens: telemetry.outputTokens,
      reasoningTokens: telemetry.reasoningTokens,
      audioInputTokens: telemetry.audioInputTokens,
      toolCalls: telemetry.toolCalls,
      latencyMs: telemetry.latencyMs,
      status: telemetry.status,
      errorCode: telemetry.errorCode,
      estimatedCostUsd:
        costOverride !== undefined
          ? costOverride
          : estimateCost(telemetry.model, telemetry),
      pricingVersion: PRICING_VERSION,
    });
  } catch (error) {
    console.error('[ai-usage] write failed', error);
  }
}
