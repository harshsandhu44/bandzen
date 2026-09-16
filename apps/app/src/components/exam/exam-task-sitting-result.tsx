import { getTask, type ScoreScale } from '@bandzen/exams/registry';
import {
  ESTIMATE_NOTE,
  PTE_SCORING_VERSION,
  formatScore,
  pteScoreReport,
  pteWeakestTaskTypes,
  type AssessmentResult,
} from '@bandzen/exams/scoring';
import { Eyebrow, PageHeader, Panel } from '@/components/app/primitives';
import { ScoreReveal } from '@/components/exam/score-reveal';
import { GradingWatch } from '@/components/app/grading-watch';

type SectionRow = {
  id: string;
  module: string;
  taskType: string | null;
  status: string;
  assessment: AssessmentResult | null;
};

const isGrading = (s: string) => s === 'grading' || s === 'in_progress';

/**
 * The result of a sitting whose content was exam tasks.
 *
 * Separate from `SittingResult` rather than bent out of it: that component is
 * built around IELTS's four modules and its two writing tasks, and every
 * number on it comes from IELTS's own rounding. Nothing here is an official
 * score — the estimate is assembled from per-task evidence by the exam's own
 * adapter, and the version that produced it is shown so a later comparison
 * against a real result knows what it is comparing.
 */
export function ExamTaskSittingResult({
  examName,
  sections,
  scale,
  target,
}: {
  examName: string;
  sections: SectionRow[];
  scale: ScoreScale;
  target: number | null;
}) {
  const marked = sections
    .map((s) => s.assessment)
    .filter((a): a is AssessmentResult => a != null);

  const report = pteScoreReport(marked);
  const weakest = pteWeakestTaskTypes(marked);
  const stillGrading = sections.filter((s) => isGrading(s.status));

  return (
    <>
      {stillGrading.map((s) => (
        <GradingWatch key={s.id} attemptId={s.id} />
      ))}

      <PageHeader
        eyebrow={`${examName} · Mock test result`}
        title={
          report.overall == null
            ? 'Nothing marked yet'
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
          {Object.entries(report.subscores ?? {}).map(([skill, score]) => (
            <div key={skill} className="flex items-baseline justify-between">
              <dt className="capitalize">{skill}</dt>
              <dd className="font-mono tabular-nums">
                {score == null
                  ? stillGrading.length
                    ? 'Being marked'
                    : 'Not measured'
                  : formatScore(scale, score)}
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

      {weakest.length ? (
        <Panel headingId="tasks" title="By task type">
          <ol className="space-y-2 text-sm">
            {weakest.map((w) => (
              <li
                key={w.taskType}
                className="flex items-baseline justify-between gap-4"
              >
                <span>
                  {getTask('pte_academic', w.taskType)?.label ?? w.taskType}
                </span>
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

      <Eyebrow>Estimate {PTE_SCORING_VERSION}</Eyebrow>
    </>
  );
}
