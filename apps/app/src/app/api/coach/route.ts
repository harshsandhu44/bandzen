import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { openai } from '@/lib/ai/client';
import { buildCoachContext, COACH_SYSTEM, MAX_TURNS } from '@/lib/ai/coach';
import { GRADER_MODEL } from '@/lib/ai/models';

/**
 * The one route handler in the application.
 *
 * Everything else is a server action, deliberately. Streaming is the exception
 * that genuinely needs a handler: a server action resolves to a value, and a
 * chat that sits silent for eight seconds and then appears at once reads as
 * broken. This is the whole of the exception — it does not become a precedent
 * for moving other writes off actions.
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

  // Assembled server-side from the caller's own rows -- the client cannot
  // supply or influence what the coach is told about the student.
  const context = await buildCoachContext(userId);

  const stream = await openai().chat.completions.create({
    model: GRADER_MODEL,
    stream: true,
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
        try {
          for await (const chunk of stream) {
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
