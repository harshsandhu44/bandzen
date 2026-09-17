import {
  fullLengthItems,
  getExam,
  scoreScaleFor,
} from '@bandzen/exams/registry';
import { notFound } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import {
  finalizeExamTaskSitting,
  getExamScoreReport,
  getExamTaskSitting,
  getMockResult,
  getProfile,
  listEnrollments,
  listOfficialScores,
  sittingTaskTypes,
} from '@/lib/db/queries';
import { sittingReportState } from '@/lib/exam-sitting';
import { SittingResult } from '@/components/exam/sitting-result';
import { ExamTaskSittingResult } from '@/components/exam/exam-task-sitting-result';
import { OfficialScoreForm } from '@/components/exam/official-score-form';
import { retrySittingGrading, saveOfficialScore } from './actions';

export const metadata = { title: 'Mock test result' };

export default async function MockResultPage({
  params,
}: PageProps<'/mock/[mockAttemptId]/result'>) {
  const { mockAttemptId } = await params;
  const userId = await requireUserId();

  const taskSitting = await getExamTaskSitting(userId, mockAttemptId);

  // A sitting built from exam tasks has none of IELTS's four modules, so it
  // has its own result rather than empty slots in IELTS's.
  if (taskSitting) {
    const { mock } = taskSitting;
    const [expected, enrollments, recorded] = await Promise.all([
      sittingTaskTypes(mock.taskIds ?? []),
      listEnrollments(userId),
      listOfficialScores(userId, mock.examKey),
    ]);
    const state = sittingReportState(expected, taskSitting.sections);
    let report = await getExamScoreReport(userId, mockAttemptId);
    // Every task is marked but no report was written — a grader that died
    // between its write and the finalise. Writing it here heals that, and
    // the insert is a no-op if a grader got there first.
    if (!report && state === 'complete') {
      await finalizeExamTaskSitting(mockAttemptId);
      report = await getExamScoreReport(userId, mockAttemptId);
    }
    // The target for THIS sitting's exam, not the active one's.
    const target =
      enrollments.find((e) => e.examKey === mock.examKey)?.targetScore ?? null;
    const exam = getExam(mock.examKey);

    return (
      <div className="max-w-2xl space-y-8">
        <ExamTaskSittingResult
          examName={exam?.name ?? 'Exam'}
          examKey={mock.examKey}
          report={report}
          state={state}
          sections={taskSitting.sections}
          scale={scoreScaleFor(mock.examKey)}
          target={target}
          items={{
            sat: mock.taskIds?.length ?? 0,
            full: fullLengthItems(exam!),
          }}
          retryAction={retrySittingGrading}
        />
        {/* Kept below the estimate and visually apart from it: this is the one
            number here that is not a guess. Only once there is a finished
            estimate to pair it with. */}
        {report ? (
          <OfficialScoreForm
            scale={scoreScaleFor(mock.examKey)}
            action={saveOfficialScore.bind(null, mockAttemptId)}
            recorded={recorded.map((r) => ({
              score: r.score,
              takenOn: r.takenOn,
            }))}
          />
        ) : null}
      </div>
    );
  }

  const [data, profile] = await Promise.all([
    getMockResult(userId, mockAttemptId),
    getProfile(userId),
  ]);
  if (!data) notFound();

  return (
    <div className="max-w-2xl space-y-10">
      <SittingResult
        sections={data}
        target={profile?.targetScore ?? null}
        scale={scoreScaleFor(data.mock.examKey)}
        eyebrow="Mock test result"
      />
    </div>
  );
}
