import 'server-only';

import {
  loadExamTaskForGrading,
  markGradingFailed,
  writeExamTaskAssessment,
} from '@/lib/db/queries';
import { capture } from '@/lib/analytics';
import { getTask } from '@bandzen/exams/registry';
import {
  measuredSkillsFor,
  type AssessmentResult,
} from '@bandzen/exams/scoring';
import {
  pteSpeakingEvaluationSchema,
  pteWritingEvaluationSchema,
} from '@bandzen/ai/schemas';
import { runAI } from '@bandzen/ai/runtime';
import { buildPteSpeakingMessages, buildPteWritingMessages } from './messages';

type Trait = { name: string; score: number; comment: string };
type Graded = {
  traits: Trait[];
  annotations: { quote: string; kind: string; comment: string }[];
  strengths: string[];
  weaknesses: string[];
};

/** Mean trait score across the items of a session, rounded to one decimal. */
function meanTraits(graded: readonly Graded[]): Record<string, number | null> {
  const totals = new Map<string, number[]>();
  for (const g of graded) {
    for (const t of g.traits) {
      totals.set(t.name, [...(totals.get(t.name) ?? []), t.score]);
    }
  }
  return Object.fromEntries(
    [...totals].map(([name, scores]) => [
      name,
      Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    ]),
  );
}

/**
 * Grade a PTE productive task attempt.
 *
 * Called from `after()` for an attempt `submitExamTaskAttempt` has already
 * claimed, which is why it takes no userId. Every exit path must leave
 * `attempts.status` terminal — a row stuck on 'grading' is a review page that
 * never opens.
 *
 * The result carries traits, not a score. Pearson's weighting from traits to
 * 10-90 is not published, so the estimate is assembled separately (#96) and
 * this deliberately writes `score: null` rather than inventing one.
 */
export async function gradeExamTask(attemptId: string) {
  const startedAt = Date.now();
  let gradedUserId: string | null = null;
  let ok = false;
  try {
    const work = await loadExamTaskForGrading(attemptId);
    if (!work) throw new Error('Attempt or items missing');

    const { attempt } = work;
    const { taskType } = attempt;
    if (!taskType) throw new Error('Attempt has no task type');
    const task = getTask(attempt.examKey, taskType);
    if (!task) throw new Error(`Unknown task ${taskType}`);
    const spoken = task.evaluator === 'speaking_model';

    // Nothing recorded at all: the audio grader rejects a request with no
    // audio in it (http_400), so this writes the floor directly and skips the
    // call — the same shape `gradeSpeaking` uses for a test with no answers.
    if (spoken && !work.items.some((i) => i.audioUrl)) {
      gradedUserId = await writeExamTaskAssessment(attemptId, {
        exam: attempt.examKey,
        examVersion: attempt.examVersion,
        taskType,
        score: null,
        dimensions: { Content: 0, 'Oral fluency': 0, Pronunciation: 0 },
        measuredSkills: measuredSkillsFor(
          attempt.examKey,
          taskType,
          attempt.module,
        ),
        strengths: [],
        weaknesses: ['No answer was recorded for this task.'],
        feedback: [],
      });
      ok = true;
      return;
    }

    const graded: Graded[] = [];
    for (const item of work.items) {
      if (spoken) {
        // The take is fetched here rather than trusted from the client: the
        // grader hears the stored audio, which is what was actually submitted.
        let audio: Uint8Array | null = null;
        if (item.audioUrl) {
          const res = await fetch(item.audioUrl);
          if (res.ok) audio = new Uint8Array(await res.arrayBuffer());
        }
        const { data } = await runAI({
          feature: 'speaking_grader',
          messages: buildPteSpeakingMessages({
            taskLabel: task.label,
            prompt: item.content.prompt,
            stimulusText: item.content.stimulus.text,
            transcript: item.transcript,
            audio,
          }),
          schema: pteSpeakingEvaluationSchema,
          modalities: ['text'],
          retryOnParseFailure: true,
          record: true,
          attemptId,
        });
        graded.push(data);
      } else {
        const body = item.value ?? '';
        const words = body.trim() ? body.trim().split(/\s+/).length : 0;
        const { data } = await runAI({
          feature: 'writing_grader',
          messages: buildPteWritingMessages({
            taskLabel: task.label,
            prompt: item.content.prompt,
            words: task.words ?? null,
            wordCount: words,
            body,
          }),
          schema: pteWritingEvaluationSchema,
          schemaName: 'pte_writing_report',
          record: true,
          attemptId,
        });
        // Drop any quote the model did not lift from the response — a quote
        // that is not in the text cannot be shown, and a fabricated one is
        // worse than a missing one.
        graded.push({
          ...data,
          annotations: data.annotations.filter((a) => body.includes(a.quote)),
        });
      }
    }

    const assessment: AssessmentResult = {
      exam: attempt.examKey,
      examVersion: attempt.examVersion,
      taskType,
      // Traits are evidence; the 10-90 estimate is assembled in #96.
      score: null,
      dimensions: meanTraits(graded),
      measuredSkills: measuredSkillsFor(
        attempt.examKey,
        taskType,
        attempt.module,
      ),
      strengths: graded.flatMap((g) => g.strengths),
      weaknesses: graded.flatMap((g) => g.weaknesses),
      feedback: graded.flatMap((g) =>
        g.annotations.map(({ quote, kind, comment }) => ({
          quote,
          kind,
          comment,
        })),
      ),
    };

    gradedUserId = await writeExamTaskAssessment(attemptId, assessment);
    ok = true;
  } catch (error) {
    console.error(`[grade-task] ${attemptId} failed`, error);
    gradedUserId = await markGradingFailed(attemptId);
  } finally {
    if (gradedUserId) {
      await capture(gradedUserId, 'attempt_graded', {
        module: 'writing',
        attempt_id: attemptId,
        outcome: ok ? 'graded' : 'failed',
        duration_ms: Date.now() - startedAt,
      });
    }
  }
}
