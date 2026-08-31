import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import {
  Eyebrow,
  FeatureBlock,
  SectionHeader,
} from '@/components/app/primitives';
import { LESSONS } from '@/content/lessons';
import { DIAGNOSTIC_MINUTES } from '@/lib/timing';
import type { Profile } from '@/lib/db/schema';

/**
 * The dashboard before anything has been measured.
 *
 * Replaces what used to be three stacked empty states and two locked modules —
 * "Nothing measured yet", "No tasks scheduled today", "Nothing to point at
 * yet" — which is a lot of nothing for a first impression. A candidate who has
 * just finished onboarding needs one action, evidence the app heard them, and
 * something to read if they cannot sit a test right now.
 *
 * The analytics sections keep their own empty states: those are still correct
 * once one module is measured and the other is not.
 */
export function FirstRun({
  profile,
  daysUntilTest,
}: {
  profile: Profile;
  daysUntilTest: number | null;
}) {
  // Something to do that does not need an hour of quiet. First written lesson.
  const lesson = LESSONS.find((l) => l.stages?.length);

  return (
    <div className="space-y-8">
      <FeatureBlock
        headingId="start-here"
        eyebrow="Start here"
        title="Take the diagnostic"
        meta={`One reading passage, then one Task 2 essay · ${DIAGNOSTIC_MINUTES} min`}
        action={
          <Button
            size="xl"
            nativeButton={false}
            render={<Link href="/diagnostic" />}
          >
            Take the diagnostic
            <ArrowRight />
          </Button>
        }
      >
        <p className="max-w-md pt-1 text-sm opacity-80">
          It is what turns the plan below from a default into yours. You get an
          estimated band for reading and writing, and the one thing costing you
          the most marks.
        </p>
      </FeatureBlock>

      <section aria-labelledby="told-us" className="space-y-3">
        <SectionHeader as="h2">
          <span id="told-us">What you told us</span>
        </SectionHeader>

        <dl className="divide-y divide-border border-y border-border">
          <Row label="Target">
            {profile.targetBand != null
              ? `Band ${profile.targetBand.toFixed(1)}`
              : 'Not set'}
          </Row>
          <Row label="Test date">
            {profile.testDate
              ? daysUntilTest != null && daysUntilTest > 0
                ? `${profile.testDate} · ${daysUntilTest} days`
                : profile.testDate
              : 'Not set'}
          </Row>
          <Row label="Study time">
            {profile.studyMinutes != null
              ? `${profile.studyMinutes} min a day`
              : 'Not set'}
          </Row>
        </dl>

        <p className="text-xs text-muted-foreground">
          Change any of these in{' '}
          <Link
            href="/settings"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Settings
          </Link>
          .
        </p>
      </section>

      {lesson ? (
        <section aria-labelledby="meanwhile" className="space-y-3">
          <SectionHeader as="h2">
            <span id="meanwhile">Meanwhile</span>
          </SectionHeader>
          <Link
            href={`/learn/${lesson.module}/${lesson.id}`}
            className="group flex items-center justify-between gap-4 border border-border p-4 transition-colors hover:border-foreground/30"
          >
            <div>
              <p className="text-sm font-medium">{lesson.title}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                Lesson · {lesson.minutes} min
              </p>
            </div>
            <ArrowRight
              className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </section>
      ) : null}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <Eyebrow as="dt">{label}</Eyebrow>
      <dd className="text-sm tabular-nums">{children}</dd>
    </div>
  );
}
