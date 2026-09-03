import { notFound, redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import { getAttempt } from '@/lib/db/queries';

/**
 * One canonical review screen per module, reached by a stable URL.
 *
 * The reading review and the writing report are already the right screens for
 * their modules, so this resolves which one an attempt needs rather than
 * duplicating either. `getAttempt` is scoped, so an attempt belonging to
 * someone else is a 404 here, not a redirect into their data.
 */
export default async function ReviewRedirect({
  params,
}: PageProps<'/review/[attemptId]'>) {
  const { attemptId } = await params;
  const userId = await requireUserId();

  const attempt = await getAttempt(userId, attemptId);
  if (!attempt) notFound();

  redirect(
    attempt.module === 'reading'
      ? `/reading/${attempt.id}/review`
      : attempt.module === 'listening'
        ? `/listening/${attempt.id}/review`
        : `/writing/${attempt.id}/report`,
  );
}
