import { after } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { runAIStream } from '@bandzen/ai/runtime/stream';
import { buildCoachContext, COACH_SYSTEM, MAX_TURNS } from '@/lib/ai/coach';
import { capture } from '@/lib/analytics';
import { coachAllowance, proUntil, recordCoachMessage } from '@/lib/db/queries';
import { isProAt } from '@/lib/entitlements';
import { COACH_MODEL } from '@/lib/ai/models';
import { runTutor } from '@/lib/ai/tutor';
import type { TutorAction } from '@/lib/ai/tutor-tools';

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

  // Pro gets the Coach with tools. `proUntil` is cache()-wrapped, so reading it
  // again after `coachAllowance` costs no second query. Deliberately not
  // `quota.unlimited`, which is true for Pro today but would drift the moment
  // a grant makes someone unlimited without making them Pro.
  if (isProAt(await proUntil(userId))) {
    try {
      return await tutorResponse(userId, context, parsed.data.messages);
    } catch (error) {
      // The dangerous failure here is a silent downgrade: the candidate still
      // gets an answer, so nothing looks broken, and the tools quietly stopped
      // working. Say so.
      console.error('[coach] tutor failed, falling back to plain coach', error);
    }
  }

  const { stream, done, finish } = await runAIStream({
    feature: 'coach',
    messages: [
      // First and byte-identical, so prompt caching applies -- see coach.ts.
      { role: 'system', content: COACH_SYSTEM },
      { role: 'system', content: context },
      ...parsed.data.messages,
    ],
    record: true,
    userId,
  });

  // Registered in request scope, not from inside the stream: by the time the
  // stream drains the response has long been returned, and `after()` is what
  // keeps the function alive for the pending write. Same contract the graders
  // already rely on.
  after(() => done);

  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      async start(controller) {
        // A cancelled stream has already closed its controller, so enqueueing
        // or closing it throws `TypeError: Invalid state` -- inside an async
        // `start` with nothing to catch it, which is an unhandled rejection on
        // exactly the path the abort row exists to record.
        const open = () => controller.desiredSize !== null;
        try {
          for await (const text of stream) {
            if (!open()) break;
            controller.enqueue(encoder.encode(text));
          }
          finish();
        } catch (error) {
          console.error('[coach] stream failed', error);
          finish(errorName(error));
          // The reader has already been shown partial text, so end the stream
          // with a visible note rather than an error it cannot see.
          if (open()) {
            controller.enqueue(
              encoder.encode(
                '\n\n[The answer was cut short. Please ask again.]',
              ),
            );
          }
        } finally {
          // Idempotent -- a stream that errored has already been finished, and
          // one the reader abandoned lands here with no usage chunk and is
          // recorded as 'aborted'.
          finish();
          if (open()) controller.close();
        }
      },
      cancel() {
        finish('aborted');
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

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown';
}

/**
 * The Tutor path: tool calls resolve first, so the CTA is known before the
 * first token and rides out on a header rather than needing the text stream to
 * grow a frame format.
 *
 * Base64, not raw JSON: header values are latin-1, lesson titles are
 * CMS-editable, and one em-dash in a title would throw inside the `try` above
 * and look exactly like a tutor failure.
 */
async function tutorResponse(
  userId: string,
  context: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
) {
  const { stream, action } = await runTutor(userId, context, messages);

  const headers: Record<string, string> = {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  };
  if (action) headers['X-Tutor-Action'] = encodeAction(action);

  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          for await (const text of stream) {
            controller.enqueue(encoder.encode(text));
          }
        } catch (error) {
          // Past the first token the reader has already seen text, so there is
          // no falling back to the plain path -- finish visibly instead.
          console.error('[coach] tutor stream failed', error);
          controller.enqueue(
            encoder.encode('\n\n[The answer was cut short. Please ask again.]'),
          );
        } finally {
          console.log(
            `[coach] model=${COACH_MODEL} tutor action=${action?.kind ?? 'none'}`,
          );
          controller.close();
        }
      },
    }),
    { headers },
  );
}

export function encodeAction(action: TutorAction): string {
  return Buffer.from(JSON.stringify(action), 'utf8').toString('base64');
}
