import {
  Clause,
  LegalPage,
  RegisteredDetails,
} from '@/components/marketing/legal-page';
import { brand } from '@/content/sections';

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
          Bandzen marks Reading, Writing, Listening and Speaking practice,
          explains what cost you marks, and builds a study plan from what it
          measured rather than from a generic syllabus. A coach answers
          questions with your own results in front of it.
        </p>
      </Clause>

      <Clause title="What it does not do yet">
        <p>
          There is no single mock test that runs all four modules back to
          back — each module is timed and marked on its own. We would rather
          show an honest gap than a feature that does not work.
        </p>
      </Clause>

      <Clause title="About the scores">
        <p>{brand.disclaimer}</p>
      </Clause>

      <Clause title="Who runs it">
        <RegisteredDetails email />
      </Clause>
    </LegalPage>
  );
}
