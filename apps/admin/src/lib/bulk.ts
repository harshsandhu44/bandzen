import 'server-only';
import { ok, type ActionResult } from '@/lib/action-result';

/**
 * Run one operation over a set of ids, counting successes and skips. A skip is
 * any thrown error — publish-validation failures and in-use deletes both land
 * here — so the result reads "Published 4, skipped 1" rather than aborting the
 * whole batch on the first bad row.
 */
export async function runBulk(
  ids: string[],
  op: (id: string) => Promise<unknown>,
  verb: string,
): Promise<ActionResult> {
  let done = 0;
  let skipped = 0;
  for (const id of ids) {
    try {
      await op(id);
      done += 1;
    } catch {
      skipped += 1;
    }
  }
  return ok(
    skipped > 0 ? `${verb} ${done}, skipped ${skipped}` : `${verb} ${done}`,
  );
}
