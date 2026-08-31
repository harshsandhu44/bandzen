import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PlanKey } from '@/lib/entitlements';

/**
 * Razorpay, without the SDK.
 *
 * The subscriptions API is REST with basic auth and the two signature checks
 * are `node:crypto` HMACs, so the package would buy a dependency, a bundled
 * copy of its own HTTP client, and nothing else. This is the whole surface we
 * use, and it is short enough to read in one sitting.
 *
 * ponytail: no retry and no backoff. Every call here is made in response to a
 * candidate pressing a button, so a failure has a person waiting to press it
 * again. The webhook is what makes that safe — if a subscription is created
 * and the response is lost, Razorpay still tells us about it later.
 */

const API = 'https://api.razorpay.com/v1';

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error('Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
  }
  return { keyId, keySecret };
}

async function call<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const { keyId, keySecret } = credentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const response = await fetch(`${API}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    // Razorpay puts the useful sentence in error.description. Log it rather
    // than show it: it is written for us, not for a candidate.
    const description =
      (payload as { error?: { description?: string } } | null)?.error
        ?.description ?? response.statusText;
    console.error('[razorpay]', response.status, description);
    throw new Error(`Razorpay ${response.status}`);
  }
  return payload as T;
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

/**
 * Plan ids live here rather than in `entitlements.ts` because they are
 * credentials in every practical sense: they differ between test and live
 * mode, and a plan's amount is fixed at creation, so the founding price and
 * the standard price are four separate plans rather than two.
 */
const PLAN_ENV: Record<PlanKey, { founding: string; standard: string }> = {
  monthly: {
    founding: 'RAZORPAY_PLAN_FOUNDING_MONTHLY',
    standard: 'RAZORPAY_PLAN_STANDARD_MONTHLY',
  },
  quarterly: {
    founding: 'RAZORPAY_PLAN_FOUNDING_QUARTERLY',
    standard: 'RAZORPAY_PLAN_STANDARD_QUARTERLY',
  },
};

export function razorpayPlanId(key: PlanKey, founding: boolean): string {
  const name = PLAN_ENV[key][founding ? 'founding' : 'standard'];
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

/**
 * How many cycles a subscription runs before Razorpay marks it complete.
 *
 * Razorpay requires a finite count, so this is ten years' worth rather than a
 * genuine limit — a subscription that quietly completed would drop a paying
 * candidate to Free with nothing to explain it.
 */
const TOTAL_COUNT: Record<PlanKey, number> = { monthly: 120, quarterly: 40 };

/** The founding price's real deadline. Unset means the window is closed. */
export function foundingEndsAt(): Date | null {
  const raw = process.env.FOUNDING_ENDS_AT;
  if (!raw) return null;
  const at = new Date(raw);
  return Number.isNaN(at.getTime()) ? null : at;
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export type RazorpaySubscription = {
  id: string;
  status: string;
  plan_id: string;
  short_url: string;
  current_end: number | null;
  charge_at: number | null;
  notes?: Record<string, string>;
};

export async function createSubscription(input: {
  planKey: PlanKey;
  founding: boolean;
  userId: string;
  /**
   * When billing should begin. Passed when the candidate still has time left —
   * a trial, or a founding grant — so buying early adds to what they have
   * instead of paying twice for the same days.
   */
  startAt?: Date | null;
}): Promise<RazorpaySubscription> {
  return call<RazorpaySubscription>('/subscriptions', {
    method: 'POST',
    body: {
      plan_id: razorpayPlanId(input.planKey, input.founding),
      total_count: TOTAL_COUNT[input.planKey],
      quantity: 1,
      customer_notify: 1,
      ...(input.startAt
        ? { start_at: Math.floor(input.startAt.getTime() / 1000) }
        : {}),
      // The webhook's only link back to a user. Razorpay note values must be
      // strings.
      notes: { userId: input.userId },
    },
  });
}

/**
 * Read a subscription back from Razorpay.
 *
 * Not optional and not an extra round trip: Checkout's callback returns three
 * ids and no dates, so this is the only way to learn when the paid period
 * actually ends. It also carries `notes.userId`, which is what proves the
 * subscription belongs to the person presenting the signature.
 */
export async function fetchSubscription(id: string) {
  return call<RazorpaySubscription>(`/subscriptions/${id}`);
}

export async function cancelSubscription(id: string) {
  return call<RazorpaySubscription>(`/subscriptions/${id}/cancel`, {
    method: 'POST',
    body: { cancel_at_cycle_end: 1 },
  });
}

// ---------------------------------------------------------------------------
// Signatures
// ---------------------------------------------------------------------------

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/** Constant-time, so a signature cannot be recovered a byte at a time. */
function matches(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The signature Checkout hands back after a subscription is paid.
 *
 * Note the order: for a subscription it is `payment_id|subscription_id`, the
 * reverse of the `order_id|payment_id` used for one-off payments.
 *
 * This proves Razorpay produced the pair. It proves nothing about *who* is
 * presenting it, so it is never the authorisation on its own — the caller must
 * also check that this subscription was created for this user.
 */
export function verifyCheckoutSignature(input: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}): boolean {
  const { keySecret } = credentials();
  return matches(
    sign(`${input.paymentId}|${input.subscriptionId}`, keySecret),
    input.signature,
  );
}

/**
 * Webhook authenticity. Signed over the raw request body — a re-serialised
 * object will not match, which is why the handler must read `request.text()`
 * before parsing anything.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  return matches(sign(rawBody, secret), signature);
}
