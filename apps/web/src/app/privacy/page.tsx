import {
  Clause,
  LegalPage,
  RegisteredDetails,
} from '@/components/marketing/legal-page';
import { legal } from '@/content/sections';

export const metadata = {
  title: 'Privacy policy',
  description:
    'What Bandzen collects, why, who it is shared with, and what you can ask us to do about it.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      intro={`How ${legal.entity ?? 'Bandzen'} handles your data when you use the service.`}
      updated={legal.updated}
    >
      <Clause title="What we collect">
        <p>
          <strong>Account details</strong> — your name and email address, held
          by our authentication provider so you can sign in.
        </p>
        <p>
          <strong>What you tell us about your preparation</strong> — your target
          band, exam type, test date and how long you can study each day.
        </p>
        <p>
          <strong>Your work</strong> — the answers you select, the essays you
          write, and the reports generated from them.
        </p>
        <p>
          <strong>Usage</strong> — a small number of product events, such as
          reaching a plan limit or starting a checkout, recorded against your
          account id so we can tell whether the product works.
        </p>
        <p>
          We do not collect payment card details. Razorpay does, and we never
          see them.
        </p>
      </Clause>

      <Clause title="Why we use it">
        <p>
          To mark your work and explain the result, to build your study plan, to
          give Bandzen Coach the context it needs to answer usefully, to bill
          you if you subscribe, and to keep the service secure. We do not sell
          your data and we do not use it for advertising.
        </p>
      </Clause>

      <Clause title="Who processes it">
        <p>
          A small set of providers, each doing one job: authentication, database
          hosting, application hosting, product analytics, payment processing
          (Razorpay), and the AI models that generate marking and coaching. Your
          essays are sent to a model provider in order to be marked; they are
          not used to train anyone&rsquo;s models.
        </p>
      </Clause>

      <Clause title="How long we keep it">
        <p>
          Your attempts and reports are kept while your account exists, because
          they are what your progress is measured from. Ask us to delete your
          account and we remove them, except where we must keep a record of a
          transaction for tax or accounting purposes.
        </p>
      </Clause>

      <Clause title="Your choices">
        <p>
          You can ask for a copy of your data, ask us to correct it, or ask us
          to delete your account. Write to {legal.email} and we will act within
          30 days.
        </p>
      </Clause>

      <Clause title="Contact">
        <RegisteredDetails email />
      </Clause>
    </LegalPage>
  );
}
