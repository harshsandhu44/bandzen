import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/app/primitives';
import { PreparationForm } from '@/components/app/preparation-form';
import { capture } from '@/lib/analytics';
import { requireUserId } from '@/lib/auth';
import { EXAM_KEYS } from '@bandzen/exams/registry';
import { examHasContent, getProfile } from '@/lib/db/queries';
import { saveOnboarding } from './actions';

export const metadata = { title: 'Set up your preparation' };

async function examsWithContent() {
  const has = await Promise.all(EXAM_KEYS.map((k) => examHasContent(k)));
  return EXAM_KEYS.filter((_, i) => has[i]);
}

export default async function OnboardingPage() {
  const userId = await requireUserId();
  const profile = await getProfile(userId);

  // Finished already? Nothing here to do. Settings is where this gets edited.
  if (profile?.onboardingCompletedAt) redirect('/');

  // A null profile is a candidate who has never touched this form — the top of
  // the activation funnel. It fires again if they leave and come back without
  // submitting; funnel analysis is first-touch, so that only inflates raw
  // counts. See analytics.ts.
  if (!profile) after(() => capture(userId, 'onboarding_started'));

  return (
    <div className="max-w-xl space-y-8">
      <PageHeader
        eyebrow="Set up"
        title="Tell us what you’re working towards"
        description="A few questions, one at a time. They decide what your plan contains and how hard it pushes — change any of them later in Settings."
      />

      <PreparationForm
        mode="onboarding"
        action={saveOnboarding}
        submitLabel="Build my plan"
        withContent={await examsWithContent()}
        defaults={{
          examKey: profile?.examKey ?? null,
          examVariant: profile?.examVariant ?? null,
          targetScore: profile?.targetScore ?? null,
          testDate: profile?.testDate ?? null,
          selfAssessedScore: profile?.selfAssessedScore ?? null,
          studyMinutes: profile?.studyMinutes ?? null,
          studyDays: profile?.studyDays ?? null,
        }}
      />
    </div>
  );
}
