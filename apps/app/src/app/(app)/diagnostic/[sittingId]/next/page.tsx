import { requireUserId } from '@/lib/auth';
import { SittingInterstitial } from '@/components/exam/sitting-interstitial';

export const metadata = { title: 'Diagnostic' };

export default async function DiagnosticNextPage({
  params,
}: PageProps<'/diagnostic/[sittingId]/next'>) {
  const { sittingId } = await params;
  const userId = await requireUserId();
  return <SittingInterstitial userId={userId} sittingId={sittingId} />;
}
