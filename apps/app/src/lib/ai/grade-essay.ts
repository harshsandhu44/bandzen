import 'server-only';

import {
  loadForGrading,
  markGradingFailed,
  writeReport,
} from '@/lib/db/queries';
import { capture } from '@/lib/analytics';
import { checkAwards } from '@/lib/award-check';
import { writingLengthCeiling } from '@/lib/grading';
import { runAI } from '@bandzen/ai/runtime';
import { GRADER_MODEL } from './models';
import { buildWritingMessages } from './messages';
import { CRITERION_NAMES, writingEvaluationSchema } from './schemas';

/** Half-band rounding, and never outside the scale whatever the model says. */
const toBand = (n: number) => Math.min(9, Math.max(0, Math.round(n * 2) / 2));

/**
 * Grade one essay and write its report.
 *
 * Called from `after()` so it runs past the response the candidate already
 * received, and only ever for an attempt `claimForGrading` has already
 * authorised and claimed — which is why it takes no userId.
 *
 * Every exit path must leave `attempts.status` at a terminal value; a row
 * stuck on 'grading' is a report page that polls forever.
 */
export async function gradeEssay(attemptId: string) {
  const startedAt = Date.now();
  let gradedUserId: string | null = null;
  let gradedBand: number | null = null;
  try {
    const work = await loadForGrading(attemptId);
    if (!work) throw new Error('Attempt, essay or prompt missing');

    // Trust the text, not the client-reported count.
    const words = work.body.trim() ? work.body.trim().split(/\s+/).length : 0;
    const ceiling = writingLengthCeiling(words, work.task);

    // A blank response has nothing for the model to assess — write the floor
    // directly and skip the call.
    if (words === 0) {
      gradedBand = 1;
      gradedUserId = await writeReport(attemptId, {
        band: 1,
        criteria: CRITERION_NAMES.map((name) => ({
          name,
          band: 1,
          comment: 'No response was submitted for this task.',
        })),
        annotations: [],
        strengths: [],
        weaknesses: ['Nothing was written for this task.'],
        model: 'none',
      });
      if (gradedUserId) await checkAwards(gradedUserId);
      return;
    }

    const {
      data: parsed,
      response,
      requestId,
    } = await runAI({
      feature: 'writing_grader',
      messages: buildWritingMessages(work),
      schema: writingEvaluationSchema,
      schemaName: 'writing_report',
      // The ledger keys on the attempt rather than the user: this function
      // deliberately takes no userId, and `ai-cost.mts` joins `attempts` for
      // one. Cost per submission is a per-attempt question anyway.
      record: true,
      attemptId,
    });

    // Drop annotations the model did not actually lift from the essay -- a
    // quote that isn't in the text cannot be highlighted, and a fabricated
    // one is worse than a missing one.
    const annotations = parsed.annotations.filter((a) =>
      work.body.includes(a.quote),
    );
    // An under-length response is capped at Band 2 whatever the model said.
    const band = Math.min(toBand(parsed.band), ceiling);
    gradedBand = band;

    gradedUserId = await writeReport(attemptId, {
      band,
      criteria: parsed.criteria.map((c) => ({
        ...c,
        band: Math.min(toBand(c.band), ceiling),
      })),
      annotations,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      // Recorded per report so a later blind comparison against a stronger
      // model knows what produced each score.
      model: GRADER_MODEL,
    });

    // An essay only becomes a study day here -- `submitEssay` leaves the row
    // on 'grading', which `studyDays` does not count.
    if (gradedUserId) await checkAwards(gradedUserId);

    const usage = response.usage;
    console.log(
      `[grade] ${attemptId} band ${band} · model ${GRADER_MODEL} · request ${
        requestId ?? 'unknown'
      } · cached_tokens ${
        usage?.prompt_tokens_details?.cached_tokens ?? 0
      }/${usage?.prompt_tokens ?? 0} · completion_tokens ${
        usage?.completion_tokens ?? 0
      }`,
    );
  } catch (error) {
    console.error(`[grade] ${attemptId} failed`, error);
    gradedUserId = await markGradingFailed(attemptId);
  } finally {
    if (gradedUserId) {
      await capture(gradedUserId, 'attempt_graded', {
        module: 'writing',
        attempt_id: attemptId,
        outcome: gradedBand == null ? 'failed' : 'graded',
        duration_ms: Date.now() - startedAt,
        overall_band: gradedBand,
      });
    }
  }
}
