import { after } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import type { ChatCompletionChunk } from 'openai/resources/chat/completions';
import { openai } from '@/lib/ai/client';
import { buildCoachContext, COACH_SYSTEM, MAX_TURNS } from '@/lib/ai/coach';
import { capture } from '@/lib/analytics';
import { coachAllowance, recordCoachMessage } from '@/lib/db/queries';
import { COACH_MODEL } from '@/lib/ai/models';

/**
 * One of the two route handlers in the application.
 *
 * Everything else is a server action, deliberately. Streaming is the exception
 * that genuinely needs a handler: a server action resolves to a value, and a
 * chat that sits silent for eight seconds and then appears at once reads as
 * broken. The other exception is `/api/polar`, where the caller is Polar
 * rather than a signed-in person and the raw body has to be verified before it
 * is parsed. Neither is a precedent for moving other writes off actions.
 *
 * It authenticates itself with `auth()`, exactly as every page does. The proxy
 * hydrates the session but does not gate, so this is the gate.
 */

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(MAX_TURNS * 2),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response('Bad request', { status: 400 });

  const quota = await coachAllowance(userId);
  if (!quota.allowed) {
    // 402 rather than 429: this is not rate limiting, and the client renders a
    // different thing for each. The reset date goes with it so the chat can
    // say when the next message is free instead of only that it is not.
    return Response.json(
      { error: 'quota', resetsAt: quota.resetsAt?.toISOString() ?? null },
      { status: 402 },
    );
  }

  // Counted before the stream opens, deliberately. Counting on completion
  // would make the Stop button a refund — abort every answer and the
  // allowance never moves — and a stream that dies at the first token has
  // still cost the call it was charged for.
  await recordCoachMessage(userId);
  after(() => capture(userId, 'coach_message_sent'));

  // Assembled server-side from the caller's own rows -- the client cannot
  // supply or influence what the coach is told about the student.
  const context = await buildCoachContext(userId);

  const stream = await openai().chat.completions.create({
    model: COACH_MODEL,
    stream: true,
    // The usage chunk arrives last and carries no delta, so it costs nothing
    // to ask for. Without it the Coach is the one recurring model call whose
    // spend cannot be measured at all -- see the log in `finally` below.
    stream_options: { include_usage: true },
    messages: [
      // First and byte-identical, so prompt caching applies -- see coach.ts.
      { role: 'system', content: COACH_SYSTEM },
      { role: 'system', content: context },
      ...parsed.data.messages,
    ],
  });

  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        // Set by the final chunk, which carries usage and no choices.
        let usage: ChatCompletionChunk['usage'];
        try {
          for await (const chunk of stream) {
            if (chunk.usage) usage = chunk.usage;
            const text = chunk.choices[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch (error) {
          console.error('[coach] stream failed', error);
          // The reader has already been shown partial text, so end the stream
          // with a visible note rather than an error it cannot see.
          controller.enqueue(
            encoder.encode('\n\n[The answer was cut short. Please ask again.]'),
          );
        } finally {
          // Same shape as the grader logs, so all three are greppable together.
          // A stream the reader aborted never yields the usage chunk; that is
          // a real spend we cannot see, not a bug to work around here.
          if (usage) {
            console.log(
              `[coach] model=${COACH_MODEL} cached_tokens ${usage.prompt_tokens_details?.cached_tokens ?? 0}/${usage.prompt_tokens} completion_tokens ${usage.completion_tokens}`,
            );
          }
          controller.close();
        }
      },
    }),
    {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    },
  );
}
