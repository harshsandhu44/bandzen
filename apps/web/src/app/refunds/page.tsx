import { Suspense } from 'react';

import {
  Clause,
  LegalPage,
  RegisteredDetails,
} from '@/components/marketing/legal-page';
import { ProPriceSentence } from '@/components/marketing/tier-price';
import { legal } from '@/content/sections';

/**
 * ponytail: the merchant-of-record clauses below are an unreviewed draft.
 * Polar selling on our behalf changes who the customer's contract is with,
 * which is a legal position and not a copy change. Have someone qualified read
 * this before it goes live.
 */
export const metadata = {
  title: 'Refunds and cancellation',
  description:
    'How Bandzen subscriptions are cancelled and refunded, and how long it takes.',
};

export default function RefundsPage() {
  return (
    <LegalPage
      title="Refunds and cancellation"
      intro="Short version: cancel whenever you like, keep what you have paid for, and if you change your mind within a week of a charge we refund it in full."
      updated={legal.updated}
    >
      <Clause title="Cancelling">
        <p>
          You can cancel a Bandzen Pro subscription at any time from Settings
          inside the app, which opens your billing portal at Polar. No email, no
          form, no retention call.
        </p>
        <p>
          Cancelling stops the next charge. It does not end your access
          immediately — Pro runs to the end of the period you have already paid
          for, and after that your account returns to the Free plan. Nothing you
          have written, attempted or been marked on is deleted when a
          subscription ends.
        </p>
      </Clause>

      <Clause title="Refunds">
        <p>
          If you ask within {legal.refundDays} days of a charge, we refund that
          charge in full and you do not have to give a reason. One message to{' '}
          {legal.email} is enough.
        </p>
        <p>
          Refunds are issued to the original payment method through Polar, our
          merchant of record. Once we approve one, the money typically reaches
          your bank or card within 5&ndash;10 working days; the exact timing is
          your bank&rsquo;s, not ours. A refund returns the tax you paid along
          with the price.
        </p>
        <p>
          After {legal.refundDays} days we do not refund a charge as a matter of
          course, but we would rather hear from you than not — if something has
          gone wrong at our end, write to us and we will put it right.
        </p>
      </Clause>

      <Clause title="Features described as planned">
        <p>
          Some things on our pricing page are marked <strong>planned</strong>.
          They do not work yet, and we do not claim otherwise anywhere in the
          product. If you subscribed partly because of one of them and it has
          not arrived, that is exactly the kind of situation the{' '}
          {legal.refundDays}-day refund exists for.
        </p>
      </Clause>

      <Clause title="What you are paying for">
        <p>
          <Suspense fallback="Bandzen Pro is a paid subscription.">
            <ProPriceSentence />
          </Suspense>
        </p>
        <p>
          Band scores produced by Bandzen are estimates generated for practice.
          They are not official IELTS results, and no subscription guarantees
          any particular score.
        </p>
      </Clause>

      <Clause title="Contact">
        <RegisteredDetails email />
      </Clause>
    </LegalPage>
  );
}
