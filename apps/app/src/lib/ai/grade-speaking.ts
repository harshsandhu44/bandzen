import 'server-only';

import {
  loadSpeakingForGrading,
  markGradingFailed,
  saveResponseTranscript,
  writeReport,
} from '@/lib/db/queries';
import { transcribeAudio } from '@bandzen/ai/speech';
import { capture } from '@/lib/analytics';
import { checkAwards } from '@/lib/award-check';
import { speakingCoverageCeiling } from '@/lib/grading';
import { openai } from './client';
import { SPEAKING_GRADER_MODEL } from './models';
import { buildSpeakingMessages } from './messages';
import { speakingEvaluationSchema } from './schemas';
import { parseStructured } from './structured';

/** Half-band rounding, and never outside the scale whatever the model says. */
const toBand = (n: number) => Math.min(9, Math.max(0, Math.round(n * 2) / 2));

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
  const startedAt = Date.now();
  let gradedUserId: string | null = null;
  let gradedBand: number | null = null;
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
      gradedBand = 1;
      gradedUserId = await writeReport(attemptId, {
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
        weaknesses: [
          'Nothing was recorded — record your answers to get an estimate.',
        ],
        model: 'none',
      });
      if (gradedUserId) await checkAwards(gradedUserId);
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

    const response = await openai().chat.completions.create({
      model: SPEAKING_GRADER_MODEL,
      modalities: ['text'],
      messages: buildSpeakingMessages(work.prompts, clips),
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
    gradedBand = band;

    gradedUserId = await writeReport(attemptId, {
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

    if (gradedUserId) await checkAwards(gradedUserId);

    const usage = response.usage;
    console.log(
      `[grade-speaking] ${attemptId} band ${band} · model ${SPEAKING_GRADER_MODEL} · request ${
        response._request_id ?? 'unknown'
      } · clips ${clips.length} · cached_tokens ${
        usage?.prompt_tokens_details?.cached_tokens ?? 0
      }/${usage?.prompt_tokens ?? 0} · completion_tokens ${
        usage?.completion_tokens ?? 0
      }`,
    );
  } catch (error) {
    console.error(`[grade-speaking] ${attemptId} failed`, error);
    gradedUserId = await markGradingFailed(attemptId);
  } finally {
    if (gradedUserId) {
      await capture(gradedUserId, 'attempt_graded', {
        module: 'speaking',
        attempt_id: attemptId,
        outcome: gradedBand == null ? 'failed' : 'graded',
        duration_ms: Date.now() - startedAt,
        overall_band: gradedBand,
      });
    }
  }
}
