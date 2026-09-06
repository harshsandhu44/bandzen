import 'server-only';

/**
 * Product analytics, server-side only.
 *
 * `posthog-node` queues events and needs an explicit `flush()` to be reliable
 * in a serverless function, which is a footgun that silently loses exactly the
 * events you care about. This is one POST to the same public endpoint, with no
 * queue to drain.
 *
 * Server-side also means no client bundle, no cookie banner, and — the part
 * that matters — revenue events that come from the Razorpay webhook rather
 * than from a browser, so they cannot be spoofed or lost to an ad blocker.
 */

export type AnalyticsEvent =
  // Monetisation.
  | 'quota_exhausted'
  | 'pro_feature_locked'
  | 'upgrade_viewed'
  | 'checkout_started'
  | 'subscription_activated'
  | 'subscription_cancelled'
  // Activation funnel.
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'diagnostic_completed'
  | 'attempt_started'
  | 'attempt_submitted'
  | 'attempt_graded'
  | 'report_viewed'
  | 'lesson_completed'
  | 'coach_message_sent'
  | 'mock_started';

type PropertyValue = string | number | boolean | null;

/**
 * Never throws and never blocks anything that matters. An analytics outage is
 * not a reason a candidate cannot start an essay.
 *
 * `set` writes person properties (PostHog's `$set`): pass the handful of user
 * attributes you want to break funnels down by — target band, plan — and they
 * follow the person rather than the single event.
 */
export async function capture(
  distinctId: string,
  event: AnalyticsEvent,
  properties: Record<string, PropertyValue> = {},
  set?: Record<string, PropertyValue>,
): Promise<void> {
  // NEXT_PUBLIC_, even though this only ever runs on the server: a PostHog
  // project token is public by design — it is what browser SDKs ship — so one
  // variable serves both, and adding client-side capture later needs no second
  // name. Next only inlines a NEXT_PUBLIC_ value where it is referenced, and
  // nothing in the client bundle references this.
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!apiKey) return;

  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

  try {
    await fetch(`${host}/i/v0/e`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties: set ? { ...properties, $set: set } : properties,
        timestamp: new Date().toISOString(),
      }),
      cache: 'no-store',
    });
  } catch (error) {
    console.error('[analytics]', event, error);
  }
}
