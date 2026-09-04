import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/app/primitives';
import { PreparationForm } from '@/components/app/preparation-form';
import { requireUserId } from '@/lib/auth';
import { getProfile } from '@/lib/db/queries';
import { saveOnboarding } from './actions';

export const metadata = { title: 'Set up your preparation' };

export default async function OnboardingPage() {
  const userId = await requireUserId();
  const profile = await getProfile(userId);

  // Finished already? Nothing here to do. Settings is where this gets edited.
  if (profile?.onboardingCompletedAt) redirect('/');

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
        defaults={{
          examType: profile?.examType ?? null,
          targetBand: profile?.targetBand ?? null,
          testDate: profile?.testDate ?? null,
          selfAssessedBand: profile?.selfAssessedBand ?? null,
          studyMinutes: profile?.studyMinutes ?? null,
        }}
      />
    </div>
  );
}
