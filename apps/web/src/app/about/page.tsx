import { Clause, LegalPage } from '@/components/marketing/legal-page';
import { brand, legal } from '@/content/sections';

export const metadata = {
  title: 'About',
  description:
    'What Bandzen is, what it measures, and what it deliberately does not claim.',
};

export default function AboutPage() {
  return (
    <LegalPage
      title="About Bandzen"
      intro="An IELTS preparation platform built around one idea: a score you cannot explain is not useful."
    >
      <Clause title="What it does">
        <p>
          Bandzen marks Reading and Writing practice, explains what cost you
          marks, and builds a study plan from what it measured rather than from
          a generic syllabus. A coach answers questions with your own results in
          front of it.
        </p>
      </Clause>

      <Clause title="What it does not do yet">
        <p>
          Listening and Speaking are not built. There is no audio, no
          transcription and no material for either, so they appear in the
          product as locked states that say so. We would rather show an honest
          gap than a feature that does not work.
        </p>
      </Clause>

      <Clause title="About the scores">
        <p>{brand.disclaimer}</p>
      </Clause>

      <Clause title="Who runs it">
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
