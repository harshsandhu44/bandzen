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
  /** `fill_blank`: the text, with `___` marking each gap. */
  gapped?: string;
  /** `reorder` and `sentence_builder`: the pieces, in the order shown. */
  tokens?: readonly string[];
  /** `conversation`: the examiner's turns, one answer each. */
  turns?: readonly string[];
  /** `recording` and `conversation`. */
  prepSeconds?: number;
  responseSeconds?: number;
};

export type StimulusData = {
  text?: string;
  audioUrl?: string | null;
  imageUrl?: string;
  imageAlt?: string;
};
