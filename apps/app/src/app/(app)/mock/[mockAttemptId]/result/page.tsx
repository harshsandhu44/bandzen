import { notFound } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import { getMockResult, getProfile } from '@/lib/db/queries';
import { SittingResult } from '@/components/exam/sitting-result';

export const metadata = { title: 'Mock test result' };

export default async function MockResultPage({
  params,
}: PageProps<'/mock/[mockAttemptId]/result'>) {
  const { mockAttemptId } = await params;
  const userId = await requireUserId();

  const [data, profile] = await Promise.all([
    getMockResult(userId, mockAttemptId),
    getProfile(userId),
  ]);
  if (!data) notFound();

  return (
    <div className="max-w-2xl space-y-10">
      <SittingResult
        sections={data}
        target={profile?.targetBand ?? null}
        eyebrow="Mock test result"
      />
    </div>
  );
}
