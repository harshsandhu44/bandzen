import type { ExamDefinition, TaskDefinition } from './types.ts';

/**
 * The normalised content contract for one exam task item, whatever the exam.
 * One shape carries every stimulus and response the renderers draw: text,
 * audio, image, option banks, gaps, pieces to order and examiner turns.
 *
 * The answer key and the transcript are deliberately a separate type — they
 * live in their own table and never travel with the content to a browser
 * during an attempt.
 */

export type TaskStimulus = {
  text: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
};

export type TaskContent = {
  prompt: string;
  stimulus: TaskStimulus;
  /** Choice renderers. */
  options: string[] | null;
  /** The blank renderers: the text, with GAP marking each gap. */
  gapped: string | null;
  /**
   * `fill_blank_select`: the dropdown choices for each gap, in gap order. One
   * list per gap — PTE's Reading & Writing blanks offer a different set at
   * each one, which a single flat `options` cannot express.
   */
  gapOptions: string[][] | null;
  /**
   * The piece renderers: `reorder` and `sentence_builder` order them,
   * `token_select` shows them as running text to be marked. Holding the words
   * explicitly is what makes a selection a stable id rather than an offset
   * into a string someone may later re-punctuate.
   */
  tokens: string[] | null;
  /** `conversation`: the examiner's turns. */
  turns: string[] | null;
  /** Overrides the definition's window for this item; null keeps it. */
  timing: { prepSeconds: number; responseSeconds: number } | null;
  /** 1–5: calibration for choosing items, not shown to candidates. */
  difficulty: number;
};

export type TaskAnswerKey = {
  /** Accepted answers, in the evaluator's format. Null for graded tasks. */
  answer: string[] | null;
  /** What the audio says. Server-side only. */
  transcript: string | null;
};

export const GAP = '___';

const CHOICE_RENDERERS = new Set([
  'choice_cards',
  'choice_select',
  'multi_choice',
]);
const MODEL_EVALUATORS = new Set(['writing_model', 'speaking_model']);
/** Everything drawn as text with gaps in it, however the gaps are filled. */
const FILL_RENDERERS = new Set([
  'fill_blank',
  'fill_blank_select',
  'fill_blank_drag',
]);

const gapCount = (gapped: string | null) =>
  gapped ? gapped.split(GAP).length - 1 : 0;

/**
 * Everything missing or wrong for a task item, as noun phrases ("an answer
 * key", "alt text for the image") so a caller can say "Missing: …".
 *
 * `import` checks what must be true of any draft: the right shape for the
 * task's renderer, and answers that fit it. `publish` adds what a candidate
 * needs to actually sit it: real assets, a transcript for its audio, and an
 * answer key for anything marked deterministically.
 */
export function taskContentIssues(
  _exam: ExamDefinition,
  task: TaskDefinition,
  content: TaskContent,
  key: TaskAnswerKey,
  stage: 'import' | 'publish',
): string[] {
  const issues: string[] = [];
  const s = content.stimulus;
  const publish = stage === 'publish';

  if (!content.prompt.trim()) issues.push('a prompt');

  // What the candidate is shown.
  const hasText = !!s.text?.trim();
  const hasAudio = !!s.audioUrl || (!publish && !!key.transcript);
  const hasImage = !!s.imageUrl;
  if (task.stimulus === 'text' && !hasText) issues.push('stimulus text');
  if (task.stimulus === 'audio' && !hasAudio) {
    issues.push(
      publish ? 'audio' : 'audio, or a transcript to synthesise it from',
    );
  }
  if (task.stimulus === 'image' && !hasImage) {
    if (publish) issues.push('an image');
  }
  if (
    task.stimulus === 'mixed' &&
    [hasText, hasAudio, hasImage || (!publish && !!s.imageAlt)].filter(Boolean)
      .length < 2
  ) {
    issues.push('at least two of text, audio and an image');
  }
  if ((s.imageUrl || task.stimulus === 'image') && !s.imageAlt?.trim()) {
    issues.push('alt text for the image');
  }
  if (publish && s.audioUrl && !key.transcript?.trim()) {
    issues.push('a transcript for the audio');
  }

  // What the candidate answers with.
  const options = content.options ?? [];
  const tokens = content.tokens ?? [];
  const gaps = gapCount(content.gapped);
  if (CHOICE_RENDERERS.has(task.renderer) && options.length < 2) {
    issues.push('at least two options');
  }
  if (FILL_RENDERERS.has(task.renderer) && gaps < 1) {
    issues.push(`text with ${GAP} marking each gap`);
  }
  if (task.renderer === 'fill_blank_select') {
    const perGap = content.gapOptions ?? [];
    if (perGap.length !== gaps) {
      issues.push(`one list of choices per gap (${gaps})`);
    } else if (perGap.some((choices) => choices.length < 2)) {
      issues.push('at least two choices at every gap');
    }
  }
  // A word bank needs a word for every gap; more than that are the
  // distractors the task is supposed to have.
  if (task.renderer === 'fill_blank_drag' && options.length < gaps) {
    issues.push(`a word bank covering every gap (${gaps})`);
  }
  if (
    (task.renderer === 'reorder' || task.renderer === 'sentence_builder') &&
    tokens.length < 2
  ) {
    issues.push('at least two pieces to put in order');
  }
  if (task.renderer === 'token_select' && tokens.length < 2) {
    issues.push('at least two words to mark');
  }
  if (task.renderer === 'conversation' && !content.turns?.length) {
    issues.push('at least one examiner turn');
  }
  if (
    content.timing &&
    (content.timing.prepSeconds < 0 || content.timing.responseSeconds <= 0)
  ) {
    issues.push('a response window longer than zero');
  }

  // How it is marked.
  const answer = key.answer ?? [];
  if (MODEL_EVALUATORS.has(task.evaluator)) {
    // A correct-or-incorrect spoken answer is matched against its accepted
    // forms in code, so it needs them; everything else a grader reads freely.
    if (task.scoring?.mode === 'binary') {
      if (publish && !answer.length) issues.push('the accepted answers');
    } else if (answer.length) {
      issues.push('no answer key (a grader marks this task)');
    }
    return issues;
  }
  if (!answer.length) {
    if (publish) issues.push('an answer key');
    return issues;
  }
  switch (task.evaluator) {
    case 'exact_match':
    case 'multi_match':
      if (
        CHOICE_RENDERERS.has(task.renderer) &&
        !answer.every((a) => options.includes(a))
      ) {
        issues.push('answers that are among the options');
      }
      // A marked-words answer is the positions of the wrong words, so a key
      // pointing past the end of the text can never be matched.
      if (
        task.renderer === 'token_select' &&
        !answer.every((a) => {
          const at = Number(a);
          return Number.isInteger(at) && at >= 0 && at < tokens.length;
        })
      ) {
        issues.push('answers that are positions in the text');
      }
      break;
    case 'gap_match': {
      if (answer.length !== gaps) {
        issues.push(`one answer per gap (${gaps})`);
        break;
      }
      // A gap whose key is not among its own choices can never be answered.
      const perGap = content.gapOptions ?? [];
      if (
        task.renderer === 'fill_blank_select' &&
        perGap.length === gaps &&
        answer.some((a, i) => !a.split('|').some((x) => perGap[i]?.includes(x)))
      ) {
        issues.push('answers that are among their gap\u2019s choices');
      }
      if (
        task.renderer === 'fill_blank_drag' &&
        answer.some((a) => !a.split('|').some((x) => options.includes(x)))
      ) {
        issues.push('answers that are in the word bank');
      }
      break;
    }
    case 'order_match': {
      const expected = tokens
        .map((_, i) => String(i))
        .sort()
        .join();
      if ([...answer].sort().join() !== expected) {
        issues.push('an order that uses every piece exactly once');
      }
      break;
    }
    case 'dictation_match':
      if (answer.length !== 1) issues.push('the sentence as the only answer');
      break;
  }
  return issues;
}
