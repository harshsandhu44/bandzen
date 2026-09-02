import {
  Clause,
  LegalPage,
  RegisteredDetails,
} from '@/components/marketing/legal-page';
import { legal } from '@/content/sections';

export const metadata = {
  title: 'Contact',
  description: 'How to reach the people who build Bandzen.',
};

export default function ContactPage() {
  return (
    <LegalPage
      title="Contact"
      intro="A small team builds Bandzen, and the same people answer the email."
    >
      <Clause title="Email">
        <p>
          {legal.email} — for support, billing, refunds, or telling us something
          is wrong. We answer within two working days, usually sooner.
        </p>
      </Clause>

      {legal.entity || legal.address ? (
        <Clause title="Registered details">
          <RegisteredDetails />
        </Clause>
      ) : null}

      <Clause title="Reporting a problem with a band estimate">
        <p>
          Every score Bandzen produces is an estimate from a model, and models
          get things wrong. If a report looks indefensible, send us the attempt
          and we will look at it — that feedback is how the rubric improves.
        </p>
      </Clause>
    </LegalPage>
  );
}
