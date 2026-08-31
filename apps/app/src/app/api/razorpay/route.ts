import { activateSubscription } from '@/lib/db/queries';
import { capture } from '@/lib/analytics';
import { verifyWebhookSignature } from '@/lib/razorpay';

/**
 * The second route handler in the application, and the last one.
 *
 * `/api/coach` exists because streaming needs it. This one exists because the
 * caller is Razorpay rather than a signed-in person: there is no session to
 * read, the body must be verified byte-for-byte before it is parsed, and a
 * server action receives neither. An action genuinely will not do.
 *
 * It authenticates by HMAC over the raw body. Nothing here trusts a value
 * because it arrived — the user is resolved from `notes.userId`, which we set
 * ourselves when the subscription was created.
 */

/** Everything else Razorpay sends is acknowledged and ignored. */
const HANDLED = new Set([
  'subscription.activated',
  'subscription.charged',
  'subscription.pending',
  'subscription.halted',
  'subscription.cancelled',
  'subscription.completed',
]);

type Payload = {
  event: string;
  created_at?: number;
  payload?: {
    subscription?: {
      entity?: {
        id?: string;
        status?: string;
        plan_id?: string;
        current_end?: number | null;
        notes?: Record<string, string>;
      };
    };
  };
};

export async function POST(request: Request) {
  // Raw, before anything parses it. The signature is over these exact bytes,
  // so a re-serialised object would never match.
  const raw = await request.text();

  if (
    !verifyWebhookSignature(raw, request.headers.get('x-razorpay-signature'))
  ) {
    return new Response('Invalid signature', { status: 401 });
  }

  let body: Payload;
  try {
    body = JSON.parse(raw) as Payload;
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  if (!HANDLED.has(body.event)) return new Response('Ignored', { status: 200 });

  const entity = body.payload?.subscription?.entity;
  const userId = entity?.notes?.userId;
  if (!entity?.id || !userId) {
    // A subscription we did not create, or one created before notes were set.
    // Nothing to attach it to, and retrying will not change that.
    console.error('[razorpay] event without a user', body.event, entity?.id);
    return new Response('Unattributable', { status: 200 });
  }

  await activateSubscription({
    userId,
    razorpaySubscriptionId: entity.id,
    planId: entity.plan_id ?? 'unknown',
    status: entity.status ?? body.event,
    // `greatest` in the query keeps whichever date is later, so an event that
    // carries no period end — an authenticated mandate that has not charged
    // yet — cannot shorten access that is already paid for.
    currentPeriodEnd: entity.current_end
      ? new Date(entity.current_end * 1000)
      : new Date(),
    source: 'webhook',
    // Razorpay does not promise ordering. This is what makes a delayed
    // `subscription.charged` arriving after a cancellation a no-op instead of
    // a refunded account quietly getting Pro back.
    lastEventAt: body.created_at ? new Date(body.created_at * 1000) : null,
  });

  if (body.event === 'subscription.charged') {
    await capture(userId, 'subscription_activated', {
      plan: entity.plan_id ?? 'unknown',
      via: 'webhook',
    });
  }

  // 200 on anything we have processed or deliberately skipped. A non-2xx tells
  // Razorpay to retry, which is only ever right for a failure we expect to
  // recover from.
  return new Response('OK', { status: 200 });
}
