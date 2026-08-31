import { redirect } from 'next/navigation';

/**
 * Mock tests, folded into Practice.
 *
 * "Section tests" sent people to /reading and /writing, which is what
 * Practice's "By module" already does; "Completed" listed the same fifty
 * attempts as Progress. The diagnostic was the only thing this page owned, and
 * it now sits under "Sit a test" on /practice. Kept as a redirect so a bookmark
 * still lands somewhere useful.
 */
export default function TestsPage() {
  redirect('/practice');
}
