import 'server-only';

import {
  Agent,
  assistant,
  run,
  setOpenAIAPI,
  setTracingDisabled,
  user,
} from '@openai/agents';

import { COACH_SYSTEM } from '@/lib/ai/coach';
import { COACH_MODEL } from '@/lib/ai/models';
import { tutorTools, type TutorAction } from '@/lib/ai/tutor-tools';

/**
 * The Coach with tools — a single bounded, read-only agent.
 *
 * Two configuration choices are load-bearing rather than taste:
 *
 * `setOpenAIAPI('chat_completions')`. The SDK defaults to the Responses API
 * (`DEFAULT_OPENAI_API = 'responses'` in @openai/agents-openai). We pin it back
 * because everything around it is built on the Chat Completions shape: the
 * byte-identical `COACH_SYSTEM` prefix that holds prompt caching, the
 * `prompt_tokens_details.cached_tokens` figure the grader logs print, and the
 * other four model call sites in this repo. One switch here is much cheaper
 * than re-establishing all three.
 *
 * `setTracingDisabled(true)`. The SDK's tracing uploads prompt and response
 * content to OpenAI. That content is a student's own work and their questions
 * about it, so it does not leave the request without a decision to let it.
 *
 * The SDK builds its own client from OPENAI_API_KEY rather than being handed
 * ours. It depends on `openai` through its own peer resolution, so pnpm has two
 * copies of 7.8.0 in the tree and passing our instance across that boundary is
 * a type error for no gain: the only thing our client adds is a 60s timeout,
 * and this path already aborts at 20s.
 */
setOpenAIAPI('chat_completions');
setTracingDisabled(true);

/**
 * Budgets. Enforced as run options rather than asked for in the prompt,
 * because a prompt is a request and a run option is a limit.
 *
 * Three turns is enough to read today's plan and look up one lesson and one
 * practice item. 20s is roughly twice the slowest measured Coach reply and
 * well inside the platform's own ceiling.
 */
const MAX_TURNS = 3;
const TIMEOUT_MS = 20_000;
const MAX_OUTPUT_TOKENS = 800;

/**
 * Tool-use guidance, kept out of `COACH_SYSTEM` so that prefix stays
 * byte-identical and cacheable.
 *
 * "Before you start writing" is doing real work: the CTA header is sealed at
 * the first text token, so a tool called after the model has begun answering
 * cannot reach the client.
 */
const TUTOR_SYSTEM = `You have tools that read this candidate's real Bandzen data.

Use them before you start writing, not after. If you are recommending what to do next, call get_today_plan first. If you are naming a lesson or a practice item, look it up rather than describing it from memory — the candidate sees a button for whatever you looked up.

Do not mention the tools, and do not paste links. Answer as you normally would; the button is added for you.`;

export type TutorRun = {
  /** Text chunks of the final answer, in order. */
  stream: AsyncIterable<string>;
  /** Whatever a tool returned before the first token, or null. */
  action: TutorAction | null;
};

/**
 * Run the Tutor and hand back its text plus the action to offer.
 *
 * Resolves once the first text token has arrived, not once the run finishes,
 * so the caller can set the CTA header and still stream. That is also why the
 * action is only what tools resolved *before* that token — see TUTOR_SYSTEM.
 *
 * Throws on any failure. The caller is expected to fall back to the plain
 * Coach call, and to say in the log that it did.
 */
export async function runTutor(
  userId: string,
  context: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<TutorRun> {
  const { tools, takeAction } = tutorTools(userId);

  const agent = new Agent({
    name: 'Bandzen Coach',
    // First and byte-identical, exactly as the plain path sends it.
    instructions: `${COACH_SYSTEM}\n\n${TUTOR_SYSTEM}\n\n${context}`,
    model: COACH_MODEL,
    tools,
    modelSettings: {
      // `maxTokens` would be sent as `max_tokens`, which gpt-5.x rejects
      // outright ("Unsupported parameter... use max_completion_tokens"). That
      // is a 400 on every single request, so it has to go through the
      // provider passthrough instead.
      providerData: { max_completion_tokens: MAX_OUTPUT_TOKENS },
    },
  });

  const input = messages.map((m) =>
    m.role === 'user' ? user(m.content) : assistant(m.content),
  );

  const result = await run(agent, input, {
    stream: true,
    maxTurns: MAX_TURNS,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const iterator = result[Symbol.asyncIterator]();

  // Pull events until the model actually starts answering. Everything before
  // this point is tool traffic, which is what makes the CTA available in a
  // header rather than needing a second channel.
  let first: string | null = null;
  for (;;) {
    const { value, done } = await iterator.next();
    if (done) break;
    const text = textDelta(value);
    if (text) {
      first = text;
      break;
    }
  }

  return {
    action: takeAction(),
    stream: (async function* () {
      if (first) yield first;
      for (;;) {
        const { value, done } = await iterator.next();
        if (done) break;
        const text = textDelta(value);
        if (text) yield text;
      }
      // Surfaces a guardrail or max-turns failure that the event loop swallows.
      await result.completed;
    })(),
  };
}

/** The one event shape that carries answer text; everything else is tool traffic. */
function textDelta(event: unknown): string | null {
  const e = event as { type?: string; data?: { type?: string; delta?: string } };
  if (e?.type !== 'raw_model_stream_event') return null;
  if (e.data?.type !== 'output_text_delta') return null;
  return e.data.delta || null;
}
