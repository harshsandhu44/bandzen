import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { FeatureBlock } from '@/components/app/primitives';
import { MODULE_LABEL } from '@/lib/modules';
import { targetHref, type PlanTaskState } from '@/lib/study-plan';

/**
 * The one thing the dashboard is for.
 *
 * Deliberately the loudest block on the page, which is now `FeatureBlock`'s
 * job rather than this file's. Analytics sit below it because a number the
 * candidate cannot act on is not the reason they opened the app.
 */
export function ContinuePlan({ task }: { task: PlanTaskState }) {
  const href = targetHref(task);
  const resuming = task.status === 'active';

  return (
    <FeatureBlock
      headingId="continue-heading"
      eyebrow={resuming ? 'Pick up where you left off' : 'Continue your plan'}
      title={task.label}
      meta={`${MODULE_LABEL[task.skill]} · ${task.minutes} min`}
      action={
        href ? (
          <Button size="xl" nativeButton={false} render={<Link href={href} />}>
            {resuming ? 'Resume' : 'Continue'}
            <ArrowRight />
          </Button>
        ) : (
          <p className="max-w-56 text-xs opacity-80">
            No material is seeded for this task yet, so there is nothing to
            open.
          </p>
        )
      }
    />
  );
}
