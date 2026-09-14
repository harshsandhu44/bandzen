import {
  validateEvent,
  WebhookVerificationError,
} from '@polar-sh/sdk/webhooks';
import * as Sentry from '@sentry/nextjs';
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
    // A cancellation is in this list on purpose: scheduling one does not
    // shorten anything. The candidate keeps what they paid for, and `endedAt`
    // is what says the access is actually over.
    case 'subscription.active':
    case 'subscription.updated':
    case 'subscription.uncanceled':
    case 'subscription.canceled':
    case 'subscription.revoked': {
      const data = event.data;
      const userId = await attribute(
        event.type,
        data.id,
        data.customer.externalId,
      );
      if (!userId) break;

      if (data.endedAt) {
        // The one path that moves the date backwards, and it has to: a refund
        // ends access now. `activateSubscription`'s `greatest` exists to stop a
        // stale event doing this, so it cannot be the one that does it.
        //
        // Keyed on `endedAt` rather than on the event type because any later
        // event carries it too — a `subscription.updated` landing after a
        // revocation would otherwise pass the ordering guard with a newer
        // `modified_at` and hand back the original period end through
        // `greatest`, which is Pro restored to a refunded account.
        await setSubscriptionEnd(userId, data.status, data.endedAt);
        break;
      }

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

    case 'order.paid': {
      const data = event.data;
      const userId = await attribute(
        event.type,
        data.id,
        data.customer.externalId,
      );
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

  // Everything reaching here is acknowledged: events we ignore, and events we
  // could not attribute — which have already raised a Sentry issue by now. A
  // retry fixes neither, and a 5xx would have Polar redeliver forever.
  return new Response('OK', { status: 200 });
}

/**
 * The Clerk id we set as `external_customer_id` when the checkout was made.
 *
 * Every caller of this is a subscription or an order — nothing else in the
 * switch reaches it — so there is no such thing as a miss here that does not
 * matter. A miss is money with no entitlement behind it, or a refund that
 * never took access away, and the only reason the first one went unnoticed is
 * that it looked like a log line.
 *
 * `external_customer_id` is set per checkout session in `upgrade/actions.ts`.
 * A checkout link made in the Polar dashboard has no session, so anything
 * bought through one arrives here unattributable by construction. This finds
 * out; it cannot prevent it.
 */
async function attribute(
  type: string,
  id: string,
  externalId: string | null | undefined,
): Promise<string | null> {
  if (externalId) return externalId;

  console.error('[polar] event without a user', type, id);

  // Fingerprinted on the Polar object id so each dropped payment is its own
  // issue. Grouped by message instead, only the first would ever alert — and
  // the second would be silent again unless someone remembered to resolve the
  // first, which is the failure this exists to end.
  Sentry.captureException(new Error(`Polar ${type} without a user`), {
    fingerprint: ['polar-unattributed', id],
    tags: { polar_event: type, polar_id: id },
  });

  // The same footgun `analytics.ts` refuses to carry: the transport queues,
  // the handler returns 200 immediately after this, and a frozen serverless
  // function sends nothing. Only on the path that has already failed, so the
  // happy path pays none of it.
  await Sentry.flush(2000);

  return null;
}

function headerMap(headers: Headers): Record<string, string> {
  const map: Record<string, string> = {};
  headers.forEach((value, key) => {
    map[key] = value;
  });
  return map;
}
