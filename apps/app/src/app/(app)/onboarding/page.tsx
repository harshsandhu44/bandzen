import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/app/primitives';
import { requireUserId } from '@/lib/auth';
import { getProfile } from '@/lib/db/queries';
import { OnboardingForm } from './onboarding-form';

export const metadata = { title: 'Set up your preparation' };

export default async function OnboardingPage() {
  const userId = await requireUserId();
  const profile = await getProfile(userId);

  // Finished already? Nothing here to do. Settings is where this gets edited.
  if (profile?.onboardingCompletedAt) redirect('/dashboard');

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Set up"
        title="Tell us what you’re working towards"
        description="Six answers. They decide what your plan contains and how hard it pushes — you can change any of them later in Settings."
      />

      <OnboardingForm
        examType={profile?.examType ?? null}
        targetBand={profile?.targetBand ?? null}
        testDate={profile?.testDate ?? null}
        selfAssessedBand={profile?.selfAssessedBand ?? null}
        studyMinutes={profile?.studyMinutes ?? null}
        submitLabel="Start preparing"
      />
    </div>
  );
}
