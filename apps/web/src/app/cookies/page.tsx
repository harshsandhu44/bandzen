import Link from 'next/link';

import { Clause, LegalPage } from '@/components/marketing/legal-page';
import { legal } from '@/content/sections';

export const metadata = {
  title: 'Cookie policy',
  description:
    'The cookies Bandzen sets, which are necessary, and which you can turn off.',
};

const ROWS: {
  name: string;
  category: string;
  setBy: string;
  purpose: string;
  retention: string;
}[] = [
  {
    name: 'sb-*-auth-token',
    category: 'Necessary',
    setBy: 'Supabase',
    purpose: 'Keeps you signed in and protects the sign-in flow.',
    retention: 'Session / short-lived',
  },
  {
    name: 'sidebar_state',
    category: 'Necessary',
    setBy: 'Bandzen',
    purpose: 'Remembers whether you left the app sidebar open or collapsed.',
    retention: '7 days',
  },
  {
    name: 'bz_consent',
    category: 'Necessary',
    setBy: 'Bandzen',
    purpose: 'Stores the choices you make on this page.',
    retention: '180 days',
  },
  {
    name: 'Sentry (no cookie; uses sessionStorage)',
    category: 'Necessary',
    setBy: 'Sentry',
    purpose: 'Diagnoses errors so we can fix them.',
    retention: 'Session',
  },
  {
    name: '_ga, _ga_*',
    category: 'Analytics',
    setBy: 'Google Analytics',
    purpose: 'Measures how the site is used, in aggregate.',
    retention: 'Up to 2 years (only when analytics is on)',
  },
  {
    name: 'ph_*',
    category: 'Analytics',
    setBy: 'PostHog',
    purpose: 'Measures product usage against your account.',
    retention: 'Up to 1 year (only when analytics is on)',
  },
  {
    name: '_fbp, Meta Pixel',
    category: 'Marketing',
    setBy: 'Meta',
    purpose: 'Measures whether an ad led you to Bandzen.',
    retention: 'Up to 3 months (only when marketing is on)',
  },
  {
    name: 'bz_currency',
    category: 'Necessary',
    setBy: 'Bandzen',
    purpose:
      'Remembers which currency you asked to be shown prices in, so the choice follows you between this site and the app.',
    retention: '1 year',
  },
];

/**
 * Paying happens on Polar's own site, not here.
 *
 * Nothing payment-related is set on bandzen.com — no checkout script, no
 * Stripe fraud cookie — because the card form is never on our domain. Polar
 * and Stripe set their own cookies under their own domains, governed by their
 * policies, which is worth saying plainly rather than listing cookies we do
 * not set.
 */

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie policy"
      intro={`How ${legal.entity ?? 'Bandzen'} uses cookies and similar storage.`}
      updated={legal.updated}
    >
      <Clause title="What a cookie is">
        <p>
          A cookie is a small file a site stores in your browser. Some are
          needed for the site to work at all; others are optional and only set
          if you allow them.
        </p>
      </Clause>

      <Clause title="The categories">
        <p>
          <strong>Necessary</strong> — sign-in, security, payments, and
          remembering your cookie choices. These are always on; the site does
          not work without them.
        </p>
        <p>
          <strong>Analytics</strong> — anonymous, aggregated usage data so we
          can tell which parts of the product help and which do not.
        </p>
        <p>
          <strong>Marketing</strong> — measuring whether an advertising campaign
          brought you here. Off by default.
        </p>
        <p>
          Change your choice any time from <strong>Cookie settings</strong> in
          the footer.
        </p>
      </Clause>

      <Clause title="The cookies we set">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-ink/15 border-b">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">Set by</th>
                <th className="py-2 pr-4 font-medium">Purpose</th>
                <th className="py-2 font-medium">Retention</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.name} className="border-ink/10 border-b align-top">
                  <td className="py-2 pr-4 font-mono text-[0.6875rem]">
                    {row.name}
                  </td>
                  <td className="py-2 pr-4">{row.category}</td>
                  <td className="py-2 pr-4">{row.setBy}</td>
                  <td className="py-2 pr-4">{row.purpose}</td>
                  <td className="py-2">{row.retention}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Analytics and Marketing rows are listed for transparency; those
          scripts are only loaded once you opt in.
        </p>
      </Clause>

      <Clause title="More">
        <p>
          What we do with the data these cookies collect is covered in the{' '}
          <Link href="/privacy" className="underline underline-offset-4">
            privacy policy
          </Link>
          . Questions: {legal.email}.
        </p>
      </Clause>
    </LegalPage>
  );
}
