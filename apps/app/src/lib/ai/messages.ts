import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ExamKey } from '@bandzen/exams/registry';
import { pteRubricFor } from './pte-rubrics.ts';
import { rubricFor } from './rubrics.ts';

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
  /** Whose rubric grades it. Absent means IELTS, as every graded essay so far is. */
  examKey?: ExamKey;
  task: number;
  promptText: string;
  wordCount: number;
  body: string;
}): ChatCompletionMessageParam[] {
  return [
    { role: 'system', content: rubricFor(work.examKey ?? 'ielts', 'writing') },
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
  /** Whose rubric grades it. Every Speaking test so far is IELTS. */
  exam: ExamKey = 'ielts',
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
    { role: 'system', content: rubricFor(exam, 'speaking') },
    { role: 'system', content: SPEAKING_RESPONSE_SHAPE },
    { role: 'user', content },
  ];
}

/**
 * Spelled out in the prompt because the audio grader accepts no
 * `response_format`. Same reason as `SPEAKING_RESPONSE_SHAPE`. Built from the
 * task's model traits, and sent LAST, so the rubric prefix stays cacheable.
 */
export function pteSpeakingResponseShape(traits: readonly string[]): string {
  const rows = traits
    .map(
      (name) =>
        `    { "name": ${JSON.stringify(name)}, "score": <whole number>, "comment": <string> }`,
    )
    .join(',\n');
  return `Reply with ONE JSON object and nothing else — no prose, no code fence. Shape:

{
  "traits": [
${rows}
  ],
  "annotations": [
    { "quote": <verbatim words the candidate said>, "kind": "good" | "vocabulary" | "fluency", "comment": <string> }
  ],
  "strengths": [<string>, <string>],
  "weaknesses": [<string>, <string>]
}

Exactly these traits, in that order. Two to five annotations.`;
}

/**
 * One PTE written task. The task's rubric stays first and byte-identical, so
 * the cached prefix is shared by every response to that task type. The label,
 * the source and the response go in the user turn, below the cache boundary.
 */
export function buildPteWritingMessages(work: {
  taskType: string;
  taskLabel: string;
  prompt: string;
  /** The passage summarised, or the transcript of the recording. */
  source: string | null;
  traits: readonly string[];
  wordCount: number;
  body: string;
}): ChatCompletionMessageParam[] {
  const source = work.source ? `\n\nSOURCE\n${work.source}` : '';
  return [
    { role: 'system', content: pteRubricFor(work.taskType) },
    {
      role: 'user',
      content: `TASK: ${work.taskLabel}. Score these traits: ${work.traits.join('; ')}.\n\nPROMPT\n${work.prompt}${source}\n\nCANDIDATE RESPONSE (${work.wordCount} words)\n${work.body}`,
    },
  ];
}

/**
 * One PTE spoken task: the instruction, whatever the candidate was shown or
 * heard, and their single take as audio. Scored from what the model hears —
 * Oral fluency and Pronunciation cannot be judged from a transcript.
 */
export function buildPteSpeakingMessages(work: {
  taskType: string;
  taskLabel: string;
  prompt: string;
  /** The text the candidate read or was shown, when the task has one. */
  stimulusText: string | null;
  /** What the candidate was played, when the task has audio. Server-side only. */
  transcript: string | null;
  traits: readonly string[];
  audio: Uint8Array;
}): ChatCompletionMessageParam[] {
  const content: Array<
    | { type: 'text'; text: string }
    | { type: 'input_audio'; input_audio: { data: string; format: 'wav' } }
  > = [
    {
      type: 'text',
      text: `TASK: ${work.taskLabel}.\n\nINSTRUCTION\n${work.prompt}`,
    },
  ];
  if (work.stimulusText) {
    content.push({
      type: 'text',
      text: `TEXT THE CANDIDATE WAS SHOWN\n${work.stimulusText}`,
    });
  }
  if (work.transcript) {
    content.push({
      type: 'text',
      text: `WHAT THE CANDIDATE HEARD\n${work.transcript}`,
    });
  }
  content.push({
    type: 'input_audio',
    input_audio: {
      data: Buffer.from(work.audio).toString('base64'),
      format: 'wav',
    },
  });
  return [
    { role: 'system', content: pteRubricFor(work.taskType) },
    { role: 'user', content },
    { role: 'system', content: pteSpeakingResponseShape(work.traits) },
  ];
}
