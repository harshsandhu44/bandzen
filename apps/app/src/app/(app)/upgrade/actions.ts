'use server';

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/auth';
import { capture } from '@/lib/analytics';
import {
  activateSubscription,
  getSubscription,
  proUntil,
  setSubscriptionEnd,
} from '@/lib/db/queries';
import {
  isFoundingActive,
  isProAt,
  planByKey,
  type PlanKey,
} from '@/lib/entitlements';
import {
  cancelSubscription,
  createSubscription,
  fetchSubscription,
  foundingEndsAt,
  verifyCheckoutSignature,
} from '@/lib/razorpay';

export type CheckoutHandle = {
  subscriptionId: string;
  keyId: string;
  amountLabel: string;
};

/**
 * Create the subscription and hand the browser what Checkout needs to open.
 *
 * Returns rather than redirects: Razorpay's subscription API has no
 * `callback_url`, so the payment happens in their modal on our page and the
 * result comes back through `confirmSubscription` below.
 */
export async function startCheckout(
  planKey: PlanKey,
  source: string,
): Promise<CheckoutHandle> {
  const userId = await requireUserId();

  const plan = planByKey(planKey);
  if (!plan) throw new Error('Unknown plan');

  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId) throw new Error('Missing NEXT_PUBLIC_RAZORPAY_KEY_ID');

  const founding = isFoundingActive(foundingEndsAt());

  // Someone buying during a trial or a founding grant should not pay for days
  // they already hold. Billing starts when what they have runs out, which is
  // also why the trial is a conversion moment rather than a cliff.
  const until = await proUntil(userId);
  const startAt = isProAt(until) ? until : null;

  const subscription = await createSubscription({
    planKey,
    founding,
    userId,
    startAt,
  });

  await capture(userId, 'checkout_started', {
    plan: planKey,
    founding,
    source,
    deferred: startAt != null,
  });

  return {
    subscriptionId: subscription.id,
    keyId,
    amountLabel: plan.label,
  };
}

/**
 * Turn a paid Checkout into access.
 *
 * Three things have to be true, and the signature is only the first:
 *
 *  1. Razorpay produced this payment/subscription pair — the HMAC.
 *  2. The subscription is one *we* created for *this* user — `notes.userId`.
 *     The signature says nothing about identity, and the three ids are visible
 *     to the browser that paid, so without this check any signed-in user could
 *     replay someone else's triple and take their subscription.
 *  3. Razorpay agrees it is paid, and tells us when the period ends. Checkout
 *     returns no dates, so this is read back rather than assumed.
 */
export async function confirmSubscription(input: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
  source: string;
}): Promise<{ ok: boolean }> {
  const userId = await requireUserId();

  if (
    !verifyCheckoutSignature({
      paymentId: input.paymentId,
      subscriptionId: input.subscriptionId,
      signature: input.signature,
    })
  ) {
    console.error('[upgrade] signature mismatch', input.subscriptionId);
    return { ok: false };
  }

  const subscription = await fetchSubscription(input.subscriptionId);
  if (subscription.notes?.userId !== userId) {
    console.error('[upgrade] subscription not owned by caller', {
      subscriptionId: input.subscriptionId,
    });
    return { ok: false };
  }

  await activateSubscription({
    userId,
    razorpaySubscriptionId: subscription.id,
    planId: subscription.plan_id,
    status: subscription.status,
    currentPeriodEnd: periodEnd(subscription.current_end),
    source: input.source,
    // The webhook will carry Razorpay's own event times. This path has none,
    // so it stays null and never blocks a later event from applying.
    lastEventAt: null,
  });

  await capture(userId, 'subscription_activated', {
    plan: subscription.plan_id,
    source: input.source,
    via: 'checkout',
  });

  // The sidebar block, every meter and every locked control are server
  // rendered, so without this they stay Free until something else happens to
  // revalidate — at the exact moment the candidate is looking for proof that
  // their money did something.
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function cancelPro(): Promise<{ ok: boolean }> {
  const userId = await requireUserId();

  const subscription = await getSubscription(userId);
  if (!subscription?.razorpaySubscriptionId) return { ok: false };

  const cancelled = await cancelSubscription(
    subscription.razorpaySubscriptionId,
  );

  // Written directly rather than through `activateSubscription`, whose
  // `greatest` exists to stop a stale webhook moving the date backwards —
  // which is exactly what a cancellation legitimately needs to do.
  await setSubscriptionEnd(
    userId,
    cancelled.status,
    periodEnd(cancelled.current_end, subscription.currentPeriodEnd),
  );

  await capture(userId, 'subscription_cancelled', {
    plan: subscription.planId,
  });

  revalidatePath('/', 'layout');
  return { ok: true };
}

/**
 * Razorpay's `current_end` in seconds, or a sensible floor.
 *
 * It is null until the first charge settles. Falling back to what the row
 * already held means a confirmation that arrives early never shortens access;
 * falling back to now means a brand-new row grants nothing until the webhook
 * says otherwise, which is the safe direction to be wrong in.
 */
function periodEnd(current: number | null, fallback?: Date): Date {
  if (current) return new Date(current * 1000);
  return fallback ?? new Date();
}
