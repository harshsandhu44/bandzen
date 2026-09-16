import type { TaskContent } from '@bandzen/exams/content';
import type { TaskDefinition } from '@bandzen/exams/registry';

/**
 * What a task renderer is handed: the stimulus to show and the item to answer.
 * Deliberately loose — each renderer reads the fields its task type needs and
 * the CMS's task-content schema is what guarantees they are there.
 */

export type TaskOption = { value: string; label: string };

export type TaskItem = {
  prompt: string;
  /** Choice renderers. */
  options?: readonly TaskOption[];
  /** The blank renderers: the text, with `___` marking each gap. */
  gapped?: string;
  /** `fill_blank_select`: the choices at each gap, in gap order. */
  gapOptions?: readonly (readonly string[])[];
  /** `reorder` and `sentence_builder`: the pieces, in the order shown. */
  tokens?: readonly string[];
  /** `conversation`: the examiner's turns, one answer each. */
  turns?: readonly string[];
  /** `recording` and `conversation`. */
  prepSeconds?: number;
  responseSeconds?: number;
  /** `essay`, where the format states a length. */
  minWords?: number;
  maxWords?: number;
};

export type StimulusData = {
  text?: string;
  audioUrl?: string | null;
  imageUrl?: string;
  imageAlt?: string;
};

/**
 * A stored exam task, as the renderers take it. The answer key never enters:
 * `TaskContent` does not carry one.
 */
export function itemFromContent(
  task: TaskDefinition,
  content: TaskContent,
): { stimulus: StimulusData; item: TaskItem } {
  const window =
    content.timing ??
    (task.timing.scope === 'task'
      ? {
          prepSeconds: task.timing.prepSeconds,
          responseSeconds: task.timing.responseSeconds,
        }
      : null);
  return {
    stimulus: {
      text: content.stimulus.text ?? undefined,
      audioUrl: content.stimulus.audioUrl,
      imageUrl: content.stimulus.imageUrl ?? undefined,
      imageAlt: content.stimulus.imageAlt ?? undefined,
    },
    item: {
      prompt: content.prompt,
      options: content.options?.map((o) => ({ value: o, label: o })),
      gapped: content.gapped ?? undefined,
      gapOptions: content.gapOptions ?? undefined,
      tokens: content.tokens ?? undefined,
      turns: content.turns ?? undefined,
      ...(task.words
        ? { minWords: task.words.min, maxWords: task.words.max }
        : {}),
      ...(window ?? {}),
    },
  };
}
