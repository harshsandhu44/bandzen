import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { WRITING_RUBRIC } from './rubric.ts';
import { SPEAKING_RUBRIC } from './speaking-rubric.ts';

/**
 * The exact messages each grader sends, and nothing else.
 *
 * Split out of `grade-essay.ts` / `grade-speaking.ts` so a model comparison
 * can replay the real prompt rather than a copy of it that drifts. Both
 * graders import from here, so there is one definition to drift.
 *
 * Deliberately not `server-only`, and deliberately free of `@/lib/db` and
 * `openai()`: `scripts/eval-grader.mts` imports it directly, exactly as
 * `packages/ai/src/client.ts` stays importable for the generation scripts.
 * Keep it that way — an import of the data layer here is what would break it.
 *
 * The rubric MUST stay first and byte-identical in both, or prompt caching
 * silently stops applying and nothing in the response reveals it.
 */

/** Spelled out in the prompt because audio models accept no `response_format`. */
export const SPEAKING_RESPONSE_SHAPE = `Reply with ONE JSON object and nothing else — no prose, no code fence. Shape:

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

const PART_LABEL: Record<number, string> = {
  1: 'Part 1',
  2: 'Part 2 (long turn)',
  3: 'Part 3 (discussion)',
};

export function buildWritingMessages(work: {
  task: number;
  promptText: string;
  wordCount: number;
  body: string;
}): ChatCompletionMessageParam[] {
  return [
    { role: 'system', content: WRITING_RUBRIC },
    {
      role: 'user',
      content: `Task ${work.task}.\n\nPROMPT\n${work.promptText}\n\nCANDIDATE RESPONSE (${work.wordCount} words)\n${work.body}`,
    },
  ];
}

/**
 * `prompts` is every prompt in the test, in order. `clips` holds only the ones
 * the candidate answered — an unanswered prompt becomes an explicit gap rather
 * than a silent omission, because a grader that cannot see the gap has no way
 * to mark the test as incomplete.
 */
export function buildSpeakingMessages(
  prompts: Array<{ promptId: string; part: number; text: string }>,
  clips: Array<{ promptId: string; bytes: Uint8Array }>,
): ChatCompletionMessageParam[] {
  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'input_audio'; input_audio: { data: string; format: 'wav' } }
  > = [];
  const clipByPrompt = new Map(clips.map((c) => [c.promptId, c]));

  for (const p of prompts) {
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

  const missing = prompts.length - clips.length;
  if (missing > 0) {
    content.push({
      type: 'text',
      text: `The candidate answered ${clips.length} of ${prompts.length} prompts and left ${missing} with no response at all. A Speaking band rewards sustained production across the whole interview; unanswered prompts must pull Fluency and Coherence and the overall band down sharply.`,
    });
  }

  return [
    { role: 'system', content: SPEAKING_RUBRIC },
    { role: 'system', content: SPEAKING_RESPONSE_SHAPE },
    { role: 'user', content },
  ];
}
