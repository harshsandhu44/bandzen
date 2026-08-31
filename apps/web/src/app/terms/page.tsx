import Link from 'next/link';

import { Clause, LegalPage } from '@/components/marketing/legal-page';
import { brand, legal } from '@/content/sections';

export const metadata = {
  title: 'Terms of service',
  description: 'The terms you agree to when you use Bandzen.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      intro={`These terms cover your use of Bandzen, operated by ${legal.entity}. Using the service means you accept them.`}
      updated={legal.updated}
    >
      <Clause title="1. The service">
        <p>
          Bandzen is an independent IELTS preparation platform. It provides
          practice material, automated marking, and study guidance. It does not
          administer the IELTS test and cannot register you for one.
        </p>
      </Clause>

      <Clause title="2. Estimates, not official scores">
        <p>{brand.disclaimer}</p>
        <p>
          Nothing in the service is a prediction of your result on test day, and
          no plan or subscription guarantees any band.
        </p>
      </Clause>

      <Clause title="3. Your account">
        <p>
          You need an account to use the product, and you are responsible for
          what happens under it. Accounts are personal — sharing one, or
          reselling access, is not permitted. You must be old enough to enter a
          contract in your jurisdiction, or have a guardian&rsquo;s consent.
        </p>
      </Clause>

      <Clause title="4. Subscriptions and payment">
        <p>
          The Free plan is free. Bandzen Pro is a recurring subscription billed
          in Indian Rupees through Razorpay, which processes the payment and
          holds your payment details — we never see your card or UPI
          credentials.
        </p>
        <p>
          A subscription renews automatically at the end of each period until it
          is cancelled. Cancellation, renewal and refund terms are set out in
          the{' '}
          <Link href="/refunds" className="underline underline-offset-4">
            refunds and cancellation policy
          </Link>
          , which forms part of these terms.
        </p>
        <p>
          Prices may change. A change never applies to a period you have already
          paid for, and we will tell you before a new price applies to you.
        </p>
      </Clause>

      <Clause title="5. Your content">
        <p>
          Essays and answers you write remain yours. You grant us the permission
          needed to store them and to process them for marking and feedback —
          including sending them to the model providers that generate that
          feedback — and for nothing else.
        </p>
      </Clause>

      <Clause title="6. Acceptable use">
        <p>
          Do not attempt to extract answer keys or generated material in bulk,
          resell access, disrupt the service, or use it to produce work you will
          present as your own where that is not permitted. We may suspend an
          account that does.
        </p>
      </Clause>

      <Clause title="7. Availability">
        <p>
          We aim to keep the service running but do not guarantee uninterrupted
          availability. Features described as planned may change or may not
          ship.
        </p>
      </Clause>

      <Clause title="8. Liability">
        <p>
          To the extent the law allows, our liability arising from your use of
          Bandzen is limited to the amount you paid us in the twelve months
          before the claim. Nothing here limits liability that cannot lawfully
          be limited.
        </p>
      </Clause>

      <Clause title="9. Changes and contact">
        <p>
          We may update these terms; material changes will be notified in the
          product. Questions go to {legal.email}.
        </p>
        <p>
          {legal.entity}
          <br />
          {legal.address}
        </p>
      </Clause>
    </LegalPage>
  );
}
