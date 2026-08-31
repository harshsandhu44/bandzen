'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import type { PlanKey } from '@/lib/entitlements';
import { confirmSubscription, startCheckout } from './actions';

/**
 * The only client-side JavaScript the billing surface has.
 *
 * Razorpay's subscription API takes no `callback_url`, so a hosted payment
 * page cannot return anyone here with a signature — they would finish on
 * Razorpay's own success screen and have to find their way back. Checkout's
 * modal keeps them on this page, and its `handler` gives the result straight
 * to a server action, which is also why this adds no third route handler.
 */

type RazorpayResult = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = { open: () => void };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

/** Loaded on first press rather than on page load — most visitors never buy. */
function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('load')), {
        once: true,
      });
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('load'));
    document.head.appendChild(script);
  });
}

export function CheckoutButton({
  planKey,
  source,
  label,
  variant = 'default',
  email,
  name,
}: {
  planKey: PlanKey;
  source: string;
  label: string;
  variant?: 'default' | 'outline';
  email?: string | null;
  name?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      await loadCheckout();
      const handle = await startCheckout(planKey, source);
      if (!window.Razorpay) throw new Error('Checkout unavailable');

      const checkout = new window.Razorpay({
        key: handle.keyId,
        subscription_id: handle.subscriptionId,
        name: 'Bandzen',
        description: `Bandzen Pro · ${handle.amountLabel}`,
        prefill: { email: email ?? undefined, name: name ?? undefined },
        theme: { color: '#000000' },
        handler: async (result: RazorpayResult) => {
          const { ok } = await confirmSubscription({
            paymentId: result.razorpay_payment_id,
            subscriptionId: result.razorpay_subscription_id,
            signature: result.razorpay_signature,
            source,
          });
          if (ok) {
            router.push('/dashboard');
            router.refresh();
          } else {
            // The payment itself went through — the webhook will still land,
            // so this is a "we cannot confirm it yet", not a "it failed".
            setError(
              'Payment received, but we could not confirm it here. Refresh in a moment — if it still says Free, contact us and we will sort it out.',
            );
          }
          setBusy(false);
        },
        modal: { ondismiss: () => setBusy(false) },
      });

      checkout.open();
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
