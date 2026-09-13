import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import { activateSubscription, setSubscriptionEnd } from '@/lib/db/queries';
import { capture } from '@/lib/analytics';

/**
 * Polar's side of the truth.
 *
 * Verification is `validateEvent`, not a hand-rolled HMAC: Polar follows the
 * Standard Webhooks spec, which signs `id.timestamp.body` with a base64 secret,
 * enforces a timestamp tolerance and permits more than one valid signature
 * during a rotation. The SDK tracks that spec; we would have to.
 */

export async function POST(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[polar] POLAR_WEBHOOK_SECRET is not set');
    return new Response('Not configured', { status: 500 });
  }

  // Raw, before anything parses it. The signature is over these exact bytes,
  // so a re-serialised object would never match.
  const raw = await request.text();

  let event;
  try {
    event = validateEvent(raw, headerMap(request.headers), secret);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return new Response('Invalid signature', { status: 403 });
    }
    throw error;
  }

  switch (event.type) {
    // A cancellation is in this list on purpose: it does not shorten anything.
    // The candidate keeps what they paid for, and `subscription.revoked` is
    // what actually ends it.
    case 'subscription.active':
    case 'subscription.updated':
    case 'subscription.uncanceled':
    case 'subscription.canceled': {
      const data = event.data;
      const userId = attribute(event.type, data.id, data.customer.externalId);
      if (!userId) break;

      await activateSubscription({
        userId,
        polarSubscriptionId: data.id,
        planId: data.productId,
        status: data.status,
        currentPeriodEnd: data.currentPeriodEnd,
        source: 'webhook',
        currency: data.currency.toUpperCase(),
        amountMinor: data.amount,
        // `modified_at` is null on a freshly created object, and null is the
        // permissive branch of the ordering guard — so falling back to
        // `created_at` is what stops every creation event bypassing the guard
        // it was written for.
        lastEventAt: data.modifiedAt ?? data.createdAt,
      });
      break;
    }

    case 'subscription.revoked': {
      const data = event.data;
      const userId = attribute(event.type, data.id, data.customer.externalId);
      if (!userId) break;

      // The one path that legitimately moves the date backwards — access ends
      // now, which is exactly what `activateSubscription`'s `greatest` forbids.
      await setSubscriptionEnd(userId, 'revoked', new Date());
      break;
    }

    case 'order.paid': {
      const data = event.data;
      const userId = attribute(event.type, data.id, data.customer.externalId);
      if (!userId) break;

      await capture(
        userId,
        'subscription_activated',
        {
          plan: data.productId,
          via: 'webhook',
          currency: data.currency.toUpperCase(),
          amount_minor: data.totalAmount,
        },
        { plan: 'pro' },
      );
      break;
    }
  }

  // Everything reaching here is acknowledged, including events we ignore and
  // events we cannot attribute. A retry fixes neither.
  return new Response('OK', { status: 200 });
}

/** The Clerk id we set as `external_customer_id` when the checkout was made. */
function attribute(
  type: string,
  id: string,
  externalId: string | null | undefined,
): string | null {
  if (externalId) return externalId;
  console.error('[polar] event without a user', type, id);
  return null;
}

function headerMap(headers: Headers): Record<string, string> {
  const map: Record<string, string> = {};
  headers.forEach((value, key) => {
    map[key] = value;
  });
  return map;
}
