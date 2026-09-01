/**
 * One-time import of the hand-authored LESSONS/RESOURCES arrays into their
 * new DB tables, run once when `lessons`/`resources` moved to the CMS.
 *
 * It already ran successfully — every row from the old arrays is in the DB,
 * grandfathered in as `status: 'published'`. `src/content/lessons.ts` and
 * `resources.ts` were then rewritten as thin async wrappers around
 * `@bandzen/db/queries`, which deleted the arrays this script read from, so
 * it can no longer run (nor does it need to — there's nothing left to
 * import). Kept as a record of how the migration was done, not as a live
 * script.
 */

console.log(
  'This migration already ran; its source arrays no longer exist. Nothing to do.',
);
process.exit(0);
