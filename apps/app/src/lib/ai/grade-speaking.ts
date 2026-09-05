import 'server-only';

import {
  loadSpeakingForGrading,
  markGradingFailed,
  saveResponseTranscript,
  writeReport,
} from '@/lib/db/queries';
import { transcribeAudio } from '@bandzen/ai/speech';
import { checkAwards } from '@/lib/award-check';
import { speakingCoverageCeiling } from '@/lib/grading';
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
    if (!work || work.prompts.length === 0) {
      throw new Error('Test or prompts missing');
    }
    const answered = work.prompts.filter((p) => p.audioUrl);
    const totalPrompts = work.prompts.length;
    const missing = totalPrompts - answered.length;

    // Nothing recorded at all: write the floor and skip the model, the same
    // as a blank essay. The section still gets a band so a mock overall can
    // still be computed.
    if (answered.length === 0) {
      const userId = await writeReport(attemptId, {
        band: 1,
        criteria: [
          'Fluency and Coherence',
          'Lexical Resource',
          'Grammatical Range and Accuracy',
          'Pronunciation',
        ].map((name) => ({
          name,
          band: 1,
          comment: 'No answers were recorded for this test.',
        })),
        annotations: [],
        strengths: [],
        weaknesses: ['Nothing was recorded — record your answers to get an estimate.'],
        model: 'none',
      });
      if (userId) await checkAwards(userId);
      return;
    }

    // Fetch every recording once. Reused for both Whisper and the grader.
    const clips = await Promise.all(
      answered.map(async (a) => {
        const res = await fetch(a.audioUrl!);
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
    const clipByPrompt = new Map(clips.map((c) => [c.promptId, c]));
    // Walk every prompt in order — answered ones carry their audio, unanswered
    // ones are shown as gaps so the grader knows the test was not completed.
    for (const p of work.prompts) {
      content.push({
        type: 'text',
        text: `${PART_LABEL[p.part] ?? `Part ${p.part}`} — examiner: ${p.text}`,
      });
      const clip = clipByPrompt.get(p.promptId);
      if (clip) {
        content.push({
          type: 'input_audio',
          input_audio: {
            data: Buffer.from(clip.bytes).toString('base64'),
            format: 'wav',
          },
        });
      } else {
        content.push({
          type: 'text',
          text: '[No response recorded for this prompt.]',
        });
      }
    }
    if (missing > 0) {
      content.push({
        type: 'text',
        text: `The candidate answered ${answered.length} of ${totalPrompts} prompts and left ${missing} with no response at all. A Speaking band rewards sustained production across the whole interview; unanswered prompts must pull Fluency and Coherence and the overall band down sharply.`,
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

    // Deterministic backstop: the model has been told about the gaps, but cap
    // the estimate at what the answered fraction can actually support so a
    // half-finished test never comes back as a mid band.
    const ceiling = speakingCoverageCeiling(answered.length, totalPrompts);
    const band = Math.min(toBand(parsed.band), ceiling);

    const userId = await writeReport(attemptId, {
      band,
      criteria: parsed.criteria.map((c) => ({
        ...c,
        band: Math.min(toBand(c.band), ceiling),
      })),
      annotations,
      strengths: parsed.strengths,
      weaknesses:
        missing > 0
          ? [
              `Only ${answered.length} of ${totalPrompts} questions were answered — record the rest for a full estimate.`,
              ...parsed.weaknesses,
            ].slice(0, 3)
          : parsed.weaknesses,
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
