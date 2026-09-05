import * as Sentry from '@sentry/nextjs';

// ponytail: errors only, no performance/session tracing — add tracesSampleRate
// if we ever need latency data, not just crash reports.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0,
});
