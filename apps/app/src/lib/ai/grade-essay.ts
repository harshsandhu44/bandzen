import 'server-only';

import {
  loadForGrading,
  markGradingFailed,
  writeReport,
} from '@/lib/db/queries';
import { openai } from './client';
import { GRADER_MODEL } from './models';
import { WRITING_RUBRIC } from './rubric';
import { writingEvaluationSchema } from './schemas';
import { parseStructured, strictJsonSchema } from './structured';

const REPORT_SCHEMA = strictJsonSchema(writingEvaluationSchema);

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
  try {
    const work = await loadForGrading(attemptId);
    if (!work) throw new Error('Attempt, essay or prompt missing');

    const response = await openai().chat.completions.create({
      model: GRADER_MODEL,
      messages: [
        // The rubric MUST come first and byte-identical -- see rubric.ts.
        { role: 'system', content: WRITING_RUBRIC },
        {
          role: 'user',
          content: `Task ${work.task}.\n\nPROMPT\n${work.promptText}\n\nCANDIDATE RESPONSE (${work.wordCount} words)\n${work.body}`,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'writing_report',
          strict: true,
          schema: REPORT_SCHEMA,
        },
      },
    });

    const parsed = parseStructured(response, writingEvaluationSchema);

    // Drop annotations the model did not actually lift from the essay -- a
    // quote that isn't in the text cannot be highlighted, and a fabricated
    // one is worse than a missing one.
    const annotations = parsed.annotations.filter((a) =>
      work.body.includes(a.quote),
    );
    const band = toBand(parsed.band);

    await writeReport(attemptId, {
      band,
      criteria: parsed.criteria.map((c) => ({ ...c, band: toBand(c.band) })),
      annotations,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      // Recorded per report so a later blind comparison against a stronger
      // model knows what produced each score.
      model: GRADER_MODEL,
    });

    const usage = response.usage;
    console.log(
      `[grade] ${attemptId} band ${band} · model ${GRADER_MODEL} · cached_tokens ${
        usage?.prompt_tokens_details?.cached_tokens ?? 0
      }/${usage?.prompt_tokens ?? 0}`,
    );
  } catch (error) {
    console.error(`[grade] ${attemptId} failed`, error);
    await markGradingFailed(attemptId);
  }
}
