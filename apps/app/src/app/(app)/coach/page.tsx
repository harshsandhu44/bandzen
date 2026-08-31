import { PageHeader } from '@/components/app/primitives';
import { CoachChat } from '@/components/coach/coach-chat';
import { COACH_PROMPTS } from '@/lib/ai/coach';
import { requireUserId } from '@/lib/auth';

export const metadata = { title: 'Bandzen Coach' };

export default async function CoachPage() {
  // The page itself renders nothing user-specific; the coach's knowledge of
  // this candidate is assembled server-side inside the route handler.
  await requireUserId();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        eyebrow="Bandzen Coach"
        title="Ask about your preparation"
        description="Coach knows your estimated bands and your marked work. It is a tutor, not an examiner — nothing it says is an official IELTS assessment."
      />
      <CoachChat prompts={COACH_PROMPTS} />
    </div>
  );
}
