'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { useConsent } from '@bandzen/ui/components/consent';

/**
 * Client-side PostHog, gated on the "analytics" consent category.
 *
 * This runs alongside the server-side `capture()` in `lib/analytics.ts`, which
 * is cookieless and keeps firing the revenue events that come from the Razorpay
 * webhook. This half adds `$pageview` and autocapture for signed-in sessions.
 * Both use the Clerk user id as `distinct_id`, so the events line up.
 *
 * No-op when the token is unset — same contract as the server side.
 *
 * ponytail: no reverse-proxy rewrite. If ad-blockers eat too many events, add a
 * `/ingest` rewrite in next.config.ts and point `api_host` at it.
 */
export function PostHogAnalytics({ userId }: { userId: string }) {
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
        capture_pageview: true,
        autocapture: true,
        persistence: 'localStorage+cookie',
      });
    }
    posthog.opt_in_capturing();
    posthog.identify(userId);
  }, [analytics, userId]);

  return null;
}
