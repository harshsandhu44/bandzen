'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/**
 * Last resort: the root layout itself threw, so there are no providers, no
 * fonts, no design tokens — this must stand alone.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          margin: 0,
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          color: '#111',
        }}
      >
        <div style={{ maxWidth: 380, padding: 24 }}>
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>
            Bandzen did not load
          </h1>
          <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>
            Reload the page. If it keeps happening, the deploy may be broken.
            {error.digest ? ` Reference ${error.digest}.` : ''}
          </p>
          <button
            onClick={reset}
            style={{ padding: '6px 12px', fontSize: 14, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
