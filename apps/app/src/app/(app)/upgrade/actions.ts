'use server';

import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import { capture } from '@/lib/analytics';
import { activateSubscription, getSubscription } from '@/lib/db/queries';
import { isProAt } from '@/lib/entitlements';
import {
  CURRENCY_COOKIE,
  appOrigin,
  clientIp,
  currencyCookieOptions,
  resolveCurrency,
} from '@/lib/currency';
import { polar, polarPricing, productId } from '@/lib/polar';
import { asCurrency } from '@bandzen/pricing/currency';
import { planByKey, type PlanKey } from '@bandzen/pricing/plans';

/**
 * Send the candidate to Polar's checkout for this plan.
 *
 * The currency is decided here and pinned onto the session. Polar would
 * geolocate one itself, but it would do so from this server's IP and long
 * after the page printed a number — deciding it here is what makes the price
 * advertised and the price charged the same fact.
 *
 * Nothing about money comes from the browser. The client sends a plan key and
 * a source string; everything else is read from the request or from Polar.
 */
export async function startCheckout(
  planKey: PlanKey,
  source: string,
): Promise<void> {
  const userId = await requireUserId();

  const plan = planByKey(planKey);
  if (!plan) throw new Error('Unknown plan');

  // Whatever they already pay in wins: a subscriber who travels should not be
  // renewed into a different currency because an IP address moved. Only a
  // first purchase looks at where they are.
  const existing = await getSubscription(userId);
  const currency =
    asCurrency(existing?.currency) ?? (await resolveCurrency()).currency;

  // Someone buying while a founding grant still has time should not pay for
  // days they already hold. Polar has no deferred start, so the days they are
  // owed become a trial of exactly that length and billing begins when it ends.
  const trialDays = daysLeft(existing?.currentPeriodEnd ?? null);

  // The founding offer is a rupee one, and `off` says so per currency: a plan
  // with nothing off in this currency gets no discount id. Both the id and the
  // deadline come from the same fetch the page quoted from, so the two cannot
  // disagree about which discount is live.
  const { founding } = await polarPricing();
  const discount = founding[planKey];
  const discounted = discount != null && discount.off[currency] != null;

  // Prefilled so the candidate does not retype what Clerk already knows. Polar
  // still owns the field — it is the Merchant of Record and the invoice is its
  // to address.
  const user = await currentUser();

  const checkout = await polar.checkouts.create({
    products: [productId(planKey)],
    currency: currency.toLowerCase() as 'inr' | 'usd' | 'gbp' | 'eur',
    // The anchor every later guard hangs off: Polar echoes this back on the
    // checkout and on every webhook, and it is how we know whose money this is.
    externalCustomerId: userId,
    customerEmail: user?.primaryEmailAddress?.emailAddress,
    customerName: user?.firstName ?? undefined,
    customerIpAddress: await clientIp(),
    discountId: discounted ? discount.id : undefined,
    // The discount decision is ours and it is currency-gated. Left on, this
    // defaults to true and a candidate anywhere can type any live code into
    // the form — which is how a GBP checkout took 33% off a rupee-only offer.
    allowDiscountCodes: false,
    ...(trialDays > 0
      ? { trialInterval: 'day' as const, trialIntervalCount: trialDays }
      : {}),
    // `{CHECKOUT_ID}` is interpolated by Polar. The id is the only thing that
    // comes back through the browser, and it is not trusted: `/upgrade/complete`
    // reads the checkout from Polar and checks whose it is.
    successUrl: `${await appOrigin()}/upgrade/complete?checkout_id={CHECKOUT_ID}`,
    metadata: { source },
  });

  await capture(userId, 'checkout_started', {
    plan: planKey,
    founding: discounted,
    source,
    currency,
    deferred: trialDays > 0,
  });

  redirect(checkout.url);
}

/**
 * Turn a paid checkout into access.
 *
 * Polar's embedded checkout fires `success` in the browser, and the browser is
 * not evidence. This reads the checkout back from Polar and requires two
 * things of it: that Polar agrees it succeeded, and that it belongs to the
 * caller. Without the second, any signed-in user could pass someone else's
 * checkout id — visible to the browser that paid — and take their
 * subscription.
 */
export async function confirmCheckout(
  checkoutId: string,
): Promise<{ ok: boolean }> {
  const userId = await requireUserId();

  const checkout = await polar.checkouts.get({ id: checkoutId });

  if (checkout.externalCustomerId !== userId) {
    console.error('[upgrade] checkout not owned by caller', { checkoutId });
    return { ok: false };
  }

  if (checkout.status !== 'succeeded') {
    console.error('[upgrade] checkout not paid', {
      checkoutId,
      status: checkout.status,
    });
    return { ok: false };
  }

  // Not `checkout.subscriptionId`: Polar fills that in after the checkout is
  // already `succeeded`, so reading it here loses a race we would never see
  // in the happy path and would always lose under load. The subscription is
  // looked up by the same external id the checkout was created with, which is
  // populated the moment it exists.
  //
  // Checkout carries no period end either, so that is read off the
  // subscription rather than assumed.
  const subscriptions = await polar.subscriptions.list({
    externalCustomerId: userId,
    active: true,
    limit: 1,
    sorting: ['-started_at'],
  });
  const subscription = subscriptions.result.items[0];

  if (!subscription) {
    // Paid, but Polar has not finished creating the subscription. The webhook
    // will land on it; this only means we cannot confirm it in this request.
    console.error('[upgrade] no active subscription yet', { checkoutId });
    return { ok: false };
  }

  // Read back off the checkout rather than the query string: which prompt
  // earned this is attribution, and attribution nobody can edit is worth more.
  const source =
    typeof checkout.metadata?.source === 'string'
      ? checkout.metadata.source
      : 'direct';

  await activateSubscription({
    userId,
    polarSubscriptionId: subscription.id,
    planId: subscription.productId,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd,
    source,
    currency: subscription.currency.toUpperCase(),
    amountMinor: subscription.amount,
    // The webhook carries Polar's own modification times. This path has none,
    // so it stays null and never blocks a later event from applying.
    lastEventAt: null,
  });

  await capture(
    userId,
    'subscription_activated',
    {
      plan: subscription.productId,
      source,
      via: 'checkout',
      currency: subscription.currency.toUpperCase(),
      amount_minor: subscription.amount,
    },
    { plan: 'pro' },
  );

  // The sidebar block, every meter and every locked control are server
  // rendered, so without this they stay Free until something else happens to
  // revalidate — at the exact moment the candidate is looking for proof that
  // their money did something.
  revalidatePath('/', 'layout');
  return { ok: true };
}

/**
 * Remember what a candidate would rather be billed in.
 *
 * Stores a preference, not a price. `pickCurrency` still decides what the
 * cookie is allowed to mean on every read, which is why writing it can be this
 * trusting: the rupee is granted by location, so asking for it from London
 * changes nothing.
 */
export async function setCurrency(value: string): Promise<void> {
  const currency = asCurrency(value);
  if (!currency) return;

  (await cookies()).set(
    CURRENCY_COOKIE,
    currency,
    await currencyCookieOptions(),
  );
  revalidatePath('/', 'layout');
}

/**
 * Send a subscriber to Polar's portal to see invoices, change a card or
 * cancel.
 *
 * Polar is the Merchant of Record, so the receipts and the cancellation both
 * legally belong there — and a customer being able to cancel the way they
 * signed up is a legal requirement in several of the places we now sell.
 *
 * The session is created from `external_customer_id`, which is the Clerk id we
 * set at checkout, so no Polar customer id needs storing on our side.
 */
export async function manageBilling(): Promise<void> {
  const userId = await requireUserId();

  // Settings only renders the button when there is an id, so this is a guard
  // against a hand-made request, not a state a candidate can reach. It throws
  // rather than returning: a server action that silently does nothing leaves a
  // button that looks broken.
  const subscription = await getSubscription(userId);
  if (!subscription?.polarSubscriptionId) {
    throw new Error('No Polar subscription for this user');
  }

  const session = await polar.customerSessions.create({
    externalCustomerId: userId,
  });

  redirect(session.customerPortalUrl);
}

/**
 * Whole days of access still owed, or zero.
 *
 * Rounded down: a partial day is not worth a day of free Pro, and rounding up
 * would let a refresh at the right moment stretch a grant indefinitely.
 */
function daysLeft(until: Date | null): number {
  if (!isProAt(until)) return 0;
  const ms = until!.getTime() - Date.now();
  return Math.floor(ms / 86_400_000);
}
