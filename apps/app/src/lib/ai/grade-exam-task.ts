import 'server-only';

import {
  loadExamTaskForGrading,
  markGradingFailed,
  writeExamTaskAssessment,
} from '@/lib/db/queries';
import { capture } from '@/lib/analytics';
import { getTask, type Skill } from '@bandzen/exams/registry';
import {
  answerShortQuestion,
  formScore,
  measuredSkillsFor,
  readAloudContent,
  repeatSentenceContent,
  scoreItem,
  wordsOf,
  type AssessmentResult,
} from '@bandzen/exams/scoring';
import {
  pteSpeakingEvaluationSchema,
  pteWritingEvaluationSchema,
} from '@bandzen/ai/schemas';
import { runAI } from '@bandzen/ai/runtime';
import { transcribeAudio } from '@bandzen/ai/speech';
import { buildPteSpeakingMessages, buildPteWritingMessages } from './messages';

type Feedback = {
  annotations: { quote: string; kind: string; comment: string }[];
  strengths: string[];
  weaknesses: string[];
};

/** One item, marked: every trait it earned and its raw points. */
type MarkedItem = Feedback & {
  scores: Record<string, number>;
  points: number;
  max: number;
};

const NO_FEEDBACK: Feedback = {
  annotations: [],
  strengths: [],
  weaknesses: [],
};

/** Mean of each trait across the items that were marked on it, to one decimal. */
function meanTraits(items: readonly MarkedItem[]): Record<string, number> {
  const totals = new Map<string, number[]>();
  for (const item of items) {
    for (const [name, score] of Object.entries(item.scores)) {
      totals.set(name, [...(totals.get(name) ?? []), score]);
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
 * Grade a PTE productive task attempt, item by item, under the task's
 * published scoring contract.
 *
 * Called from `after()` for an attempt `submitExamTaskAttempt` has already
 * claimed, which is why it takes no userId. Every exit path must leave
 * `attempts.status` terminal — a row stuck on 'grading' is a review page that
 * never opens.
 *
 * What code can mark, code marks: Form from the response, Read Aloud and
 * Repeat Sentence Content and Answer Short Question from a transcript of the
 * take. A gate at zero voids the item before any model is paid to read it.
 * The model marks only the traits the contract gives it. The result is raw
 * points (`correct` of `total`) and the trait means behind them — never a
 * 10-90 score, which only a finished sitting's report assembles.
 */
export async function gradeExamTask(attemptId: string) {
  const startedAt = Date.now();
  let gradedUserId: string | null = null;
  let ok = false;
  // Hoisted for the `finally`: the analytics event should say which skill was
  // graded, and every PTE speaking task was landing in the Writing funnel.
  // Not named `module` — Next reserves that identifier.
  let gradedModule: Skill = 'writing';
  try {
    const work = await loadExamTaskForGrading(attemptId);
    if (!work) throw new Error('Attempt or items missing');

    const { attempt } = work;
    const { taskType } = attempt;
    gradedModule = attempt.module;
    if (!taskType) throw new Error('Attempt has no task type');
    const task = getTask(attempt.examKey, taskType);
    const scoring = task?.scoring;
    if (!task || !scoring)
      throw new Error(`No scoring contract for ${taskType}`);
    const modelTraits = scoring.traits
      .filter((t) => t.source === 'model')
      .map((t) => t.key);

    /** Close one item: check the model returned every trait it owed. */
    const mark = (
      scores: Record<string, number>,
      referenceWords: number,
      feedback: Feedback,
    ): MarkedItem => {
      const raw = scoreItem(scoring, scores, referenceWords);
      if (!raw) {
        throw new Error(`Grader omitted a trait for ${taskType}`);
      }
      return { ...feedback, scores, ...raw };
    };
    const voided = (scores: Record<string, number>) =>
      scoring.traits.some((t) => t.gate && scores[t.key] === 0);

    const marked: MarkedItem[] = [];
    for (const item of work.items) {
      if (task.evaluator === 'speaking_model') {
        const text = item.content.stimulus.text ?? '';
        const referenceWords =
          taskType === 'read_aloud' ? wordsOf(text).length : 0;

        // Nothing recorded: every trait zero, without a call. The audio grader
        // rejects a request with no audio in it (http_400).
        if (!item.audioUrl) {
          marked.push(
            mark(
              Object.fromEntries(scoring.traits.map((t) => [t.key, 0])),
              referenceWords,
              { ...NO_FEEDBACK, weaknesses: ['No answer was recorded.'] },
            ),
          );
          continue;
        }

        // The take is fetched here rather than trusted from the client: the
        // grader hears the stored audio, which is what was actually submitted.
        const res = await fetch(item.audioUrl);
        if (!res.ok) {
          throw new Error(`Could not fetch a recording (${res.status}).`);
        }
        const audio = new Uint8Array(await res.arrayBuffer());

        const scores: Record<string, number> = {};
        if (scoring.traits.some((t) => t.source === 'deterministic')) {
          // Unlike IELTS Speaking, a failure here fails the grade: these
          // traits are counted from the transcript, and a guess is worse than
          // a retry.
          const said = await transcribeAudio(audio, `${item.taskId}.wav`, {
            record: true,
            userId: attempt.userId,
            attemptId,
            // 16 kHz mono 16-bit after a 44-byte header, as `lib/wav.ts` writes.
            seconds: Math.max(0, audio.length - 44) / 32_000,
          });
          if (taskType === 'read_aloud') {
            scores.Content = readAloudContent(text, said).score;
          } else if (taskType === 'repeat_sentence') {
            scores.Content = repeatSentenceContent(item.transcript ?? '', said);
          } else if (taskType === 'answer_short_question') {
            scores.Vocabulary = answerShortQuestion(item.answer ?? [], said);
          }
        }

        if (!modelTraits.length || voided(scores)) {
          marked.push(mark(scores, referenceWords, NO_FEEDBACK));
          continue;
        }

        const { data } = await runAI({
          feature: 'speaking_grader',
          messages: buildPteSpeakingMessages({
            taskType,
            taskLabel: task.label,
            prompt: item.content.prompt,
            stimulusText: item.content.stimulus.text,
            transcript: item.transcript,
            traits: modelTraits,
            audio,
          }),
          schema: pteSpeakingEvaluationSchema,
          modalities: ['text'],
          retryOnParseFailure: true,
          record: true,
          attemptId,
        });
        for (const t of data.traits) {
          if (modelTraits.includes(t.name)) scores[t.name] = t.score;
        }
        marked.push(mark(scores, referenceWords, data));
      } else {
        const body = item.value ?? '';
        const scores: Record<string, number> = {
          Form: formScore(taskType, body),
        };
        // Form 0 voids the response, so there is nothing for a grader to read.
        if (voided(scores)) {
          marked.push(
            mark(scores, 0, {
              ...NO_FEEDBACK,
              weaknesses: [
                `Outside the required form for ${task.label}, so it scores no points.`,
              ],
            }),
          );
          continue;
        }

        const { data } = await runAI({
          feature: 'writing_grader',
          messages: buildPteWritingMessages({
            taskType,
            taskLabel: task.label,
            prompt: item.content.prompt,
            source:
              taskType === 'summarize_spoken_text'
                ? item.transcript
                : item.content.stimulus.text,
            traits: modelTraits,
            wordCount: wordsOf(body).length,
            body,
          }),
          schema: pteWritingEvaluationSchema,
          schemaName: 'pte_writing_report',
          record: true,
          attemptId,
        });
        for (const t of data.traits) {
          if (modelTraits.includes(t.name)) scores[t.name] = t.score;
        }
        // Drop any quote the model did not lift from the response — a quote
        // that is not in the text cannot be shown, and a fabricated one is
        // worse than a missing one.
        marked.push(
          mark(scores, 0, {
            ...data,
            annotations: data.annotations.filter((a) => body.includes(a.quote)),
          }),
        );
      }
    }

    const assessment: AssessmentResult = {
      exam: attempt.examKey,
      examVersion: attempt.examVersion,
      taskType,
      // Raw points only; the 10-90 estimate belongs to a sitting's report.
      score: null,
      dimensions: {
        ...meanTraits(marked),
        correct: marked.reduce((n, m) => n + m.points, 0),
        total: marked.reduce((n, m) => n + m.max, 0),
      },
      measuredSkills: measuredSkillsFor(
        attempt.examKey,
        taskType,
        attempt.module,
      ),
      strengths: marked.flatMap((m) => m.strengths),
      weaknesses: marked.flatMap((m) => m.weaknesses),
      feedback: marked.flatMap((m) =>
        m.annotations.map(({ quote, kind, comment }) => ({
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
        module: gradedModule,
        attempt_id: attemptId,
        outcome: ok ? 'graded' : 'failed',
        duration_ms: Date.now() - startedAt,
      });
    }
  }
}
