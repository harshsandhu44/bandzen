import 'server-only';

import {
  loadSpeakingForGrading,
  markGradingFailed,
  saveResponseTranscript,
  writeReport,
} from '@/lib/db/queries';
import { transcribeAudio } from '@bandzen/ai/speech';
import { checkAwards } from '@/lib/award-check';
import { openai } from './client';
import { SPEAKING_GRADER_MODEL } from './models';
import { SPEAKING_RUBRIC } from './speaking-rubric';
import { speakingEvaluationSchema } from './schemas';
import { parseStructured } from './structured';

/**
 * The audio models accept no `response_format` at all — not strict Structured
 * Outputs, not JSON mode — so the shape is spelled out here instead and
 * `parseStructured` validates what comes back against
 * `speakingEvaluationSchema`. This message comes after the cacheable rubric so
 * it does not break the prefix cache.
 */
const RESPONSE_SHAPE = `Reply with ONE JSON object and nothing else — no prose, no code fence. Shape:

{
  "band": <number, 0-9, whole or half>,
  "criteria": [
    { "name": "Fluency and Coherence", "band": <number>, "comment": <string> },
    { "name": "Lexical Resource", "band": <number>, "comment": <string> },
    { "name": "Grammatical Range and Accuracy", "band": <number>, "comment": <string> },
    { "name": "Pronunciation", "band": <number>, "comment": <string> }
  ],
  "annotations": [
    { "quote": <verbatim words the candidate said>, "kind": "good" | "grammar" | "vocabulary" | "fluency", "comment": <string> }
  ],
  "strengths": [<string>, <string>, <string>],
  "weaknesses": [<string>, <string>, <string>]
}

All four criteria, in that order. Four to eight annotations.`;

/** Half-band rounding, and never outside the scale whatever the model says. */
const toBand = (n: number) => Math.min(9, Math.max(0, Math.round(n * 2) / 2));

const PART_LABEL: Record<number, string> = {
  1: 'Part 1',
  2: 'Part 2 (long turn)',
  3: 'Part 3 (discussion)',
};

/**
 * Grade one submitted Speaking test and write its report.
 *
 * Same shape as `gradeEssay`: called from `after()` so it runs past the
 * response the candidate already received, and only for an attempt
 * `claimForGrading` has already claimed — hence no userId. Every exit path
 * must leave `attempts.status` terminal; a row stuck on 'grading' is a report
 * page that polls forever.
 *
 * The model hears the audio directly (that is the whole point — Fluency and
 * Pronunciation cannot be read off a transcript). Whisper still runs, but only
 * to give the review page the words to show alongside the playback.
 */
export async function gradeSpeaking(attemptId: string) {
  try {
    const work = await loadSpeakingForGrading(attemptId);
    if (!work || work.answers.length === 0) {
      throw new Error('Test, prompts or recordings missing');
    }

    // Fetch every recording once. Reused for both Whisper and the grader.
    const clips = await Promise.all(
      work.answers.map(async (a) => {
        const res = await fetch(a.audioUrl);
        if (!res.ok) {
          throw new Error(`Could not fetch a recording (${res.status}).`);
        }
        return { ...a, bytes: new Uint8Array(await res.arrayBuffer()) };
      }),
    );

    // Transcripts are for the review page, and for checking the grader's
    // quotes below. A failure here must not fail the grade, which hears the
    // audio and does not depend on them.
    const transcripts = await Promise.all(
      clips.map(async (c) => {
        try {
          const text = await transcribeAudio(c.bytes, `${c.promptId}.wav`);
          await saveResponseTranscript(attemptId, c.promptId, text);
          return text;
        } catch (e) {
          console.error(`[grade-speaking] transcript ${c.promptId} failed`, e);
          return '';
        }
      }),
    );

    const content: Array<
      | { type: 'text'; text: string }
      | { type: 'input_audio'; input_audio: { data: string; format: 'wav' } }
    > = [];
    for (const c of clips) {
      content.push({
        type: 'text',
        text: `${PART_LABEL[c.part] ?? `Part ${c.part}`} — examiner: ${c.text}`,
      });
      content.push({
        type: 'input_audio',
        input_audio: {
          data: Buffer.from(c.bytes).toString('base64'),
          format: 'wav',
        },
      });
    }

    const response = await openai().chat.completions.create({
      model: SPEAKING_GRADER_MODEL,
      modalities: ['text'],
      messages: [
        // The rubric MUST come first and byte-identical -- see speaking-rubric.ts.
        { role: 'system', content: SPEAKING_RUBRIC },
        { role: 'system', content: RESPONSE_SHAPE },
        { role: 'user', content },
      ],
    });

    const parsed = parseStructured(response, speakingEvaluationSchema);

    // Drop annotations the model did not actually lift from an answer -- a
    // quote the review page cannot find in a transcript is one it cannot show.
    // If every transcript failed we have nothing to check against, so keep
    // them all rather than blank the section.
    const said = transcripts.join('\n').toLowerCase();
    const annotations = said.trim()
      ? parsed.annotations.filter((a) => said.includes(a.quote.toLowerCase()))
      : parsed.annotations;

    const band = toBand(parsed.band);

    const userId = await writeReport(attemptId, {
      band,
      criteria: parsed.criteria.map((c) => ({ ...c, band: toBand(c.band) })),
      annotations,
      strengths: parsed.strengths,
      weaknesses: parsed.weaknesses,
      model: SPEAKING_GRADER_MODEL,
    });

    if (userId) await checkAwards(userId);

    const usage = response.usage;
    console.log(
      `[grade-speaking] ${attemptId} band ${band} · model ${SPEAKING_GRADER_MODEL} · clips ${clips.length} · cached_tokens ${
        usage?.prompt_tokens_details?.cached_tokens ?? 0
      }/${usage?.prompt_tokens ?? 0}`,
    );
  } catch (error) {
    console.error(`[grade-speaking] ${attemptId} failed`, error);
    await markGradingFailed(attemptId);
  }
}
