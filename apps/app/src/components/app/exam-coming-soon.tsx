import Link from 'next/link';
import {
  sectionMinutesLabel,
  type ExamDefinition,
} from '@bandzen/exams/registry';
import { formatScore } from '@bandzen/exams/scoring';
import { Button } from '@bandzen/ui/components/button';
import { Eyebrow, Panel } from '@/components/app/primitives';

/**
 * What a candidate preparing for an exam Bandzen has no content for yet sees
 * in place of practice, plans and scores. Built only from the exam definition
 * and what they told us, so it is true: nothing here is sample material under
 * the exam's name, and no IELTS number is passed off as theirs.
 */
export function ExamComingSoon({
  exam,
  targetScore,
  testDate,
}: {
  exam: ExamDefinition;
  targetScore?: number | null;
  testDate?: string | null;
}) {
  const scale = exam.scoreScale;
  return (
    <Panel
      headingId="exam-coming-soon"
      title={`${exam.name} practice is on the way`}
    >
      <div className="space-y-6">
        <p className="max-w-prose text-sm text-muted-foreground text-pretty">
          Bandzen does not have {exam.name} content yet, so there is nothing to
          sit, score or plan here. Your target and test date are saved, and this
          page fills in when practice for your exam arrives. Anything you have
          already done for another exam stays in Progress.
        </p>

        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <Eyebrow as="dt">Format</Eyebrow>
            <dd className="mt-0.5 text-sm">{exam.version}</dd>
          </div>
          <div>
            <Eyebrow as="dt">Scored</Eyebrow>
            <dd className="mt-0.5 text-sm tabular-nums">
              {formatScore(scale, scale.min)}–{formatScore(scale, scale.max)}
            </dd>
          </div>
          <div>
            <Eyebrow as="dt">Your target</Eyebrow>
            <dd className="mt-0.5 text-sm tabular-nums">
              {targetScore != null
                ? formatScore(scale, targetScore)
                : 'Not set'}
              {testDate ? ` · ${testDate}` : ''}
            </dd>
          </div>
        </dl>

        <ul className="divide-y divide-border border-y border-border">
          {exam.sections.map((section) => {
            const tasks = exam.tasks.filter((t) => t.section === section.key);
            return (
              <li
                key={section.key}
                className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm"
              >
                <span>{section.label}</span>
                <span className="text-xs text-muted-foreground">
                  {tasks.length} task {tasks.length === 1 ? 'type' : 'types'}
                  {sectionMinutesLabel(section)
                    ? ` · ${sectionMinutesLabel(section)}`
                    : ''}
                </span>
              </li>
            );
          })}
        </ul>

        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/settings" />}
        >
          Change exam
        </Button>
      </div>
    </Panel>
  );
}
