import { redirect } from 'next/navigation';

/**
 * Study plan, folded into the dashboard.
 *
 * The two pages rendered the same `TodaysPlan` component and the same
 * Estimated/Target/Days row; the only thing /plan had to itself was the "Coming
 * up" week view, which now lives on /dashboard. Kept as a redirect rather than
 * deleted, so a bookmark still lands somewhere useful.
 */
export default function PlanPage() {
  redirect('/dashboard');
}
