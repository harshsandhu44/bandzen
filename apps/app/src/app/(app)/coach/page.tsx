import Link from 'next/link';
import { getExam } from '@bandzen/exams/registry';
import { Button } from '@bandzen/ui/components/button';
import { EmptyState, PageHeader } from '@/components/app/primitives';
import { CoachChat } from '@/components/coach/coach-chat';
import { COACH_PROMPTS } from '@/lib/ai/coach';
import { capture } from '@/lib/analytics';
import { requireUserId } from '@/lib/auth';
import { coachAllowance, getProfile } from '@/lib/db/queries';

export const metadata = { title: 'Bandzen Coach' };

export default async function CoachPage() {
  // The coach's knowledge of this candidate is still assembled server-side
  // inside the route handler; the only thing read here is the allowance, which
  // has to be known before the first message or the meter would start stale.
  const userId = await requireUserId();
  const [quota, profile] = await Promise.all([
    coachAllowance(userId),
    getProfile(userId),
  ]);

  // Coach is an IELTS tutor, built on IELTS results and IELTS material. For
  // another exam it would have nothing true to say, so it says that instead.
  const exam = getExam(profile?.examKey ?? 'ielts')!;
  if (exam.key !== 'ielts') {
    return (
      <div className="flex max-w-3xl flex-col gap-6">
        <PageHeader eyebrow="Bandzen Coach" title="Coach covers IELTS only" />
        <EmptyState
          title={`Coach does not know ${exam.name} yet`}
          description={`Coach answers from your IELTS results and Bandzen's IELTS material, so it would be guessing about ${exam.name}. Switch your active exam to IELTS to use it.`}
          action={
            <Button
              size="sm"
              variant="outline"
              nativeButton={false}
              render={<Link href="/settings" />}
            >
              Change exam
            </Button>
          }
        />
      </div>
    );
  }

  if (!quota.unlimited && quota.remaining === 0) {
    await capture(userId, 'quota_exhausted', { surface: 'coach' });
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        eyebrow="Bandzen Coach"
        title="Ask about your preparation"
        description="Coach knows your estimated bands and your marked work. It is a tutor, not an examiner — nothing it says is an official IELTS assessment."
      />
      <CoachChat
        prompts={COACH_PROMPTS}
        quota={quota}
        timezone={profile?.timezone}
      />
    </div>
  );
}
