import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@bandzen/ui/components/button';
import { PageHeader } from '@/components/app/primitives';
import { confirmCheckout } from '../actions';

export const metadata = { title: 'Confirming your payment' };

/**
 * Where Polar sends the candidate back to.
 *
 * The only thing that crosses the browser is a checkout id, and it is treated
 * as a claim rather than a fact: `confirmCheckout` reads the checkout from
 * Polar and refuses one that is not this user's. A wrong or invented id ends
 * up on the "we cannot confirm it yet" copy below and nowhere near an
 * entitlement.
 *
 * Confirming in a page render rather than a route handler is deliberate — a
 * route handler could not read the session the guard depends on without
 * duplicating the whole gate.
 */
export default async function CheckoutCompletePage(
  props: PageProps<'/upgrade/complete'>,
) {
  const { checkout_id: checkoutId } = await props.searchParams;

  const { ok } =
    typeof checkoutId === 'string'
      ? await confirmCheckout(checkoutId)
      : { ok: false };

  // Nothing to say on the happy path: they came here to get Pro, not to read
  // a receipt. Settings has the receipt.
  if (ok) redirect('/?upgraded=1');

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader
        eyebrow="Bandzen Pro"
        title="Your payment went through"
        description="We have not been able to confirm it here yet. This usually settles within a minute — reload and it should say Pro. If it still says Free after that, message us and we will sort it out; nothing is lost."
      />
      <div className="flex flex-wrap gap-2">
        <Button nativeButton={false} render={<Link href="/settings" />}>
          Check your plan
        </Button>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/">Back to your dashboard</Link>}
        />
      </div>
    </div>
  );
}
