import { requireUserId } from '@/lib/auth';
import { SittingInterstitial } from '@/components/exam/sitting-interstitial';

export const metadata = { title: 'Mock test' };

export default async function MockNextPage({
  params,
}: PageProps<'/mock/[mockAttemptId]/next'>) {
  const { mockAttemptId } = await params;
  const userId = await requireUserId();
  return <SittingInterstitial userId={userId} sittingId={mockAttemptId} />;
}
