import {
  fullLengthItems,
  getExam,
  scoreScaleFor,
} from '@bandzen/exams/registry';
import { notFound } from 'next/navigation';
import { requireUserId } from '@/lib/auth';
import {
  getExamTaskSitting,
  getMockResult,
  getProfile,
  listOfficialScores,
} from '@/lib/db/queries';
import { SittingResult } from '@/components/exam/sitting-result';
import { ExamTaskSittingResult } from '@/components/exam/exam-task-sitting-result';
import { OfficialScoreForm } from '@/components/exam/official-score-form';
import { saveOfficialScore } from './actions';

export const metadata = { title: 'Mock test result' };

export default async function MockResultPage({
  params,
}: PageProps<'/mock/[mockAttemptId]/result'>) {
  const { mockAttemptId } = await params;
  const userId = await requireUserId();

  const [taskSitting, profile] = await Promise.all([
    getExamTaskSitting(userId, mockAttemptId),
    getProfile(userId),
  ]);

  // A sitting built from exam tasks has none of IELTS's four modules, so it
  // has its own result rather than empty slots in IELTS's.
  if (taskSitting) {
    const recorded = await listOfficialScores(userId, taskSitting.mock.examKey);
    return (
      <div className="max-w-2xl space-y-8">
        <ExamTaskSittingResult
          examName={getExam(taskSitting.mock.examKey)?.name ?? 'Exam'}
          sections={taskSitting.sections}
          scale={scoreScaleFor(taskSitting.mock.examKey)}
          target={profile?.targetScore ?? null}
          items={{
            sat: taskSitting.mock.taskIds?.length ?? 0,
            full: fullLengthItems(getExam(taskSitting.mock.examKey)!),
          }}
        />
        {/* Kept below the estimate and visually apart from it: this is the one
            number here that is not a guess. */}
        <OfficialScoreForm
          scale={scoreScaleFor(taskSitting.mock.examKey)}
          action={saveOfficialScore.bind(null, mockAttemptId)}
          recorded={recorded.map((r) => ({
            score: r.score,
            takenOn: r.takenOn,
          }))}
        />
      </div>
    );
  }

  const data = await getMockResult(userId, mockAttemptId);
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
