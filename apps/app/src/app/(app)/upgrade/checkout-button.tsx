'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { PolarEmbedCheckout } from '@polar-sh/checkout/embed';
import { Button } from '@bandzen/ui/components/button';
import type { PlanKey } from '@bandzen/pricing/plans';
import { confirmCheckout, startCheckout } from './actions';

/**
 * The only client-side JavaScript the billing surface has.
 *
 * Polar's embedded checkout keeps the candidate on this page rather than
 * sending them to a hosted page they have to find their way back from. Its
 * `success` event is a signal, not evidence — it only tells us to go and ask
 * the server, which reads the checkout back from Polar before granting
 * anything.
 */

export function CheckoutButton({
  planKey,
  source,
  label,
  variant = 'default',
}: {
  planKey: PlanKey;
  source: string;
  label: string;
  variant?: 'default' | 'outline';
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      // The id comes back from our own server, not from the iframe. It would
      // not matter if it did: `confirmCheckout` reads the checkout from Polar
      // and refuses one that is not this user's.
      const { id, url } = await startCheckout(planKey, source);
      const checkout = await PolarEmbedCheckout.create(url, { theme: 'light' });

      checkout.addEventListener('success', async () => {
        const { ok } = await confirmCheckout(id, source);
        if (ok) {
          router.push('/');
          router.refresh();
        } else {
          // The payment itself went through — the webhook will still land, so
          // this is a "we cannot confirm it yet", not a "it failed".
          setError(
            'Payment received, but we could not confirm it here. Refresh in a moment — if it still says Free, contact us and we will sort it out.',
          );
        }
        setBusy(false);
      });

      checkout.addEventListener('close', () => setBusy(false));
    } catch (cause) {
      console.error('[checkout]', cause);
      setError('Could not open checkout. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={variant}
        className="w-full"
        disabled={busy}
        onClick={pay}
      >
        {busy ? 'Opening…' : label}
        {busy ? null : <ArrowRight />}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive text-pretty">
          {error}
        </p>
      ) : null}
    </div>
  );
}
