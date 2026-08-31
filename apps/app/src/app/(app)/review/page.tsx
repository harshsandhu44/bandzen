import { redirect } from 'next/navigation';

/**
 * Review, folded into Progress.
 *
 * Both pages answered "how am I doing" — Progress with the band trend and the
 * skill matrix, Review with the patterns and the marked attempts. They are one
 * page now. `/review/[attemptId]` is untouched: it is the resolver that sends a
 * single attempt to the right report.
 */
export default function ReviewPage() {
  redirect('/progress');
}
