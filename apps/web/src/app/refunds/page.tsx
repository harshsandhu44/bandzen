import { Clause, LegalPage } from '@/components/marketing/legal-page';
import { legal, pricing } from '@/content/sections';

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
          inside the app. No email, no form, no retention call.
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
          Refunds are issued to the original payment method through Razorpay.
          Once we approve one, Razorpay typically returns the money to your bank
          or card within 5–7 working days; the exact timing is your
          bank&rsquo;s, not ours.
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
          Bandzen Pro is currently {pricing.tiers[1].price}{' '}
          {pricing.tiers[1].period}, or {pricing.tiers[1].alt}. Prices are in
          Indian Rupees and include any applicable taxes unless stated otherwise
          at checkout.
        </p>
        <p>
          Band scores produced by Bandzen are estimates generated for practice.
          They are not official IELTS results, and no subscription guarantees
          any particular score.
        </p>
      </Clause>

      <Clause title="Contact">
        <p>
          {legal.entity}
          <br />
          {legal.address}
          <br />
          {legal.email}
        </p>
      </Clause>
    </LegalPage>
  );
}
