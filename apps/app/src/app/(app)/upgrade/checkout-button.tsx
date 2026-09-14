'use client';

import { useFormStatus } from 'react-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';

/**
 * The only client-side JavaScript the billing surface has, and it exists for
 * one reason: to stop a second click while the redirect to Polar is in flight.
 *
 * Everything else is a plain form posting to a server action, which creates
 * the checkout and redirects. Nothing about the purchase is decided here.
 */
export function CheckoutButton({
  label,
  variant = 'default',
}: {
  label: string;
  variant?: 'default' | 'outline';
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} className="w-full" disabled={pending}>
      {pending ? 'Opening…' : label}
      {pending ? null : <ArrowRight />}
    </Button>
  );
}
