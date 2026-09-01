import 'server-only';

import { awardsEarned } from '@/lib/awards';
import {
  awardCounts,
  getProfile,
  recordAwards,
  studyDays,
} from '@/lib/db/queries';

/**
 * Re-evaluate a candidate's awards against the whole event log and record
 * anything newly justified.
 *
 * Called from the write paths only — `completeLesson`, `submitReadingAttempt`
 * and `submitEssay` — because an award can only ever be *earned* at the moment
 * an activity is recorded. Time passing can end a streak; it can never complete
 * one. That keeps the dashboard a pure read, with no writes during render.
 *
 * It never throws. An award is decoration on top of work the candidate has
 * already done, and failing their submit to report one would be the wrong
 * trade every time. Nothing is lost by swallowing the error either: this reads
 * the entire log and writes with `onConflictDoNothing`, so the next activity
 * picks up whatever this call missed. The only cost is a slightly late
 * `earned_at`.
 *
 * It reads the zone itself rather than taking one, because `dates.ts` records
 * what happens when a caller forgets to pass it: a default that is wrong cannot
 * be spotted. `getProfile` is `cache`d, so a caller that already has the
 * profile pays nothing for the second read.
 */
export async function checkAwards(userId: string) {
  try {
    const profile = await getProfile(userId);
    const [days, counts] = await Promise.all([
      studyDays(userId, profile?.timezone ?? null),
      awardCounts(userId),
    ]);
    await recordAwards(userId, awardsEarned({ studyDays: days, ...counts }));
  } catch {
    // Deliberately silent. See above.
  }
}
