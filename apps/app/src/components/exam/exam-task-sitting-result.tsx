import { getTask, type ScoreScale } from '@bandzen/exams/registry';
import { ESTIMATE_NOTE, formatScore } from '@bandzen/exams/scoring';
import { Button } from '@bandzen/ui/components/button';
import { Eyebrow, PageHeader, Panel } from '@/components/app/primitives';
import { ScoreReveal } from '@/components/exam/score-reveal';
import { GradingWatch } from '@/components/app/grading-watch';
import type { StoredScoreReport } from '@/lib/db/queries';
import type { SittingReportState } from '@/lib/exam-sitting';

type SectionRow = {
  id: string;
  taskType: string | null;
  status: string;
};

/**
 * The result of a sitting whose content was exam tasks.
 *
 * Separate from `SittingResult` rather than bent out of it: that component is
 * built around IELTS's four modules and its two writing tasks, and every
 * number on it comes from IELTS's own rounding.
 *
 * Every number here comes from the sitting's stored report, written once when
 * the last task was marked — never assembled on render, so reloading, a
 * re-grade or a change to the arithmetic cannot change a result the candidate
 * has already seen. Until that report exists there is no score at all: a
 * partial one is exactly what a candidate would mistake for the result.
 */
export function ExamTaskSittingResult({
  examName,
  examKey,
  report,
  state,
  sections,
  scale,
  target,
  items,
  retryAction,
}: {
  examName: string;
  examKey: string;
  report: StoredScoreReport | null;
  state: SittingReportState;
  sections: SectionRow[];
  scale: ScoreScale;
  target: number | null;
  /** What this sitting ran, against what the real format runs. */
  items: { sat: number; full: { min: number; max: number } | null };
  retryAction: (formData: FormData) => Promise<void>;
}) {
  const label = (taskType: string | null) =>
    (taskType && getTask(examKey, taskType)?.label) ?? 'A task';

  if (!report) {
    const grading = sections.filter(
      (s) => s.status === 'grading' || s.status === 'in_progress',
    );
    const failed = sections.filter((s) => s.status === 'failed');
    return (
      <>
        {grading.map((s) => (
          <GradingWatch key={s.id} attemptId={s.id} />
        ))}
        <PageHeader
          eyebrow={`${examName} · Mock test result`}
          title={
            state === 'failed'
              ? 'Some tasks could not be marked'
              : 'Marking your test'
          }
          description={
            state === 'failed'
              ? 'Your score appears once every task is marked. Retry the tasks below; your answers are safe.'
              : 'Your score appears once every task is marked. This page updates on its own.'
          }
        />
        {failed.length ? (
          <Panel headingId="failed" title="Not marked">
            <ul className="space-y-3 text-sm">
              {failed.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-4"
                >
                  <span>{label(s.taskType)}</span>
                  <form action={retryAction}>
                    <input type="hidden" name="attemptId" value={s.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Retry marking
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
        {grading.length ? (
          <Panel headingId="grading" title="Being marked">
            <ul className="space-y-2 text-sm text-muted-foreground">
              {grading.map((s) => (
                <li key={s.id}>{label(s.taskType)}</li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={`${examName} · Mock test result`}
        title={
          report.overall == null
            ? 'Nothing measured'
            : formatScore(scale, report.overall)
        }
        description={ESTIMATE_NOTE}
      />

      {report.overall != null ? (
        <ScoreReveal
          value={report.overall}
          target={target ?? undefined}
          label="Overall"
          scale={scale}
        />
      ) : null}

      <Panel headingId="skills" title="By skill">
        <dl className="space-y-3 text-sm">
          {Object.entries(report.subscores).map(([skill, score]) => (
            <div key={skill} className="flex items-baseline justify-between">
              <dt className="capitalize">{skill}</dt>
              <dd className="font-mono tabular-nums">
                {/* Every task was marked, so a gap here really is a skill
                    this sitting did not measure. */}
                {score == null ? 'Not measured' : formatScore(scale, score)}
              </dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel headingId="parts" title="By part">
        <dl className="space-y-3 text-sm">
          {Object.entries(report.sections).map(([section, score]) => (
            <div key={section} className="flex items-baseline justify-between">
              <dt className="capitalize">{section.replace(/_/g, ' & ')}</dt>
              <dd className="font-mono tabular-nums">
                {score == null ? '—' : formatScore(scale, score)}
              </dd>
            </div>
          ))}
        </dl>
      </Panel>

      {report.taskTypes.length ? (
        <Panel headingId="tasks" title="By task type">
          <ol className="space-y-2 text-sm">
            {report.taskTypes.map((w) => (
              <li
                key={w.taskType}
                className="flex items-baseline justify-between gap-4"
              >
                <span>{label(w.taskType)}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {Math.round(w.fraction * 100)}%
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            Weakest first. Your study plan opens these.
          </p>
        </Panel>
      ) : null}

      {/* What the estimate was made from. A score assembled from a quarter of
          the format's questions is a weaker guess than one assembled from all
          of them, and the candidate is the one who should know that. */}
      {items.full && items.sat < items.full.min ? (
        <p className="text-xs text-muted-foreground">
          Estimated from the {items.sat} questions you sat. A real {examName}{' '}
          runs {items.full.min}–{items.full.max} questions.
        </p>
      ) : null}

      <Eyebrow>Estimate {report.scoringVersion}</Eyebrow>
    </>
  );
}
