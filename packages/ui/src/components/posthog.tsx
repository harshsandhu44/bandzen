'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { useConsent } from '@bandzen/ui/components/consent';
import { campaignParams } from '@bandzen/ui/lib/campaign';

/**
 * Client-side PostHog, gated on the "analytics" consent category.
 *
 * Shared by apps/web (anonymous marketing visitors, no `userId`) and apps/app
 * (signed-in sessions). One copy so the init options cannot drift apart — and
 * they must not: `persistence` and the project token are what let an anonymous
 * visitor on bandzen.com merge into the person who later signs in on
 * app.bandzen.com. posthog-js defaults `cross_subdomain_cookie` to true, so the
 * distinct_id rides a `.bandzen.com` cookie between the two.
 *
 * This runs alongside the server-side `capture()` in apps/app's
 * `lib/analytics.ts`, which is cookieless and keeps firing the revenue events
 * that come from the Razorpay webhook. This half adds `$pageview` and
 * autocapture. Both use the Clerk user id as `distinct_id`, so they line up.
 *
 * No-op when the token is unset — same contract as the server side.
 *
 * ponytail: no reverse-proxy rewrite. If ad-blockers eat too many events, add a
 * `/ingest` rewrite in next.config.ts and point `api_host` at it.
 */

/**
 * The href of the first page of this browsing session, recorded at module load
 * — before any consent check, and without writing storage of any kind, so it
 * carries no consent obligation of its own.
 *
 * Consent is opt-in, so a visitor arriving on a campaign link may click through
 * to /about before accepting the banner, and by then window.location has lost
 * the UTMs that the whole campaign exists to measure. This survives every
 * client-side navigation and dies on a hard reload, which is exactly right: a
 * reload has no campaign params to preserve either.
 */
const landingUrl = typeof window === 'undefined' ? '' : window.location.href;

export function PostHogAnalytics({ userId }: { userId?: string }) {
  const { analytics } = useConsent();

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
    if (!token) return;

    if (!analytics) {
      if (posthog.__loaded) {
        posthog.opt_out_capturing();
        posthog.reset();
      }
      return;
    }

    if (!posthog.__loaded) {
      posthog.init(token, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
        person_profiles: 'identified_only',
        // Plain `true` captures the first hard load and nothing else, which on
        // an App Router site means one $pageview per session however many
        // routes the visitor actually reads.
        capture_pageview: 'history_change',
        autocapture: true,
        persistence: 'localStorage+cookie',
      });
      // init() is synchronous and defers the first $pageview to a setTimeout,
      // so these super properties are registered in time to ride it.
      posthog.register_once(campaignParams(landingUrl));
    }
    posthog.opt_in_capturing();
    if (userId) posthog.identify(userId);
  }, [analytics, userId]);

  return null;
}
