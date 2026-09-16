/**
 * The shape every exam declares itself in. Pure data, no React and no
 * database, so the app, the CMS and the schema can all import it.
 *
 * An exam is sections; a section is tasks; a task says what the candidate is
 * shown (stimulus), how they answer (response), how long they get (timing),
 * which skills it measures, and which renderer and evaluator handle it. The
 * shared exam shell reads these instead of branching on the exam.
 */

export const EXAM_KEYS = ['ielts', 'pte_academic', 'toefl_ibt', 'det'] as const;
export type ExamKey = (typeof EXAM_KEYS)[number];

export const SKILLS = ['reading', 'writing', 'listening', 'speaking'] as const;
export type Skill = (typeof SKILLS)[number];

/** What the candidate is shown. `mixed` is two or more of the others at once. */
export const STIMULI = ['text', 'audio', 'image', 'mixed'] as const;
export type Stimulus = (typeof STIMULI)[number];

/** How the candidate answers, independent of how it is drawn. */
export const RESPONSES = [
  'single_choice',
  'multi_choice',
  'text',
  'audio',
  'reorder',
  'fill_blank',
  'conversation',
] as const;
export type ResponseType = (typeof RESPONSES)[number];

/**
 * The answer controls the app knows how to draw. The app's renderer registry
 * is typed `Record<RendererKey, …>`, so adding a key here without a component
 * there is a compile error rather than a blank screen.
 */
export const RENDERERS = [
  'choice_cards',
  'choice_select',
  'multi_choice',
  'text_input',
  'essay',
  'fill_blank',
  'fill_blank_select',
  'fill_blank_drag',
  'reorder',
  'token_select',
  'sentence_builder',
  'recording',
  'conversation',
] as const;
export type RendererKey = (typeof RENDERERS)[number];

/**
 * How a response is marked. The first five are deterministic; the last two
 * send the response to a model against the exam's rubric.
 */
export const EVALUATORS = [
  'exact_match',
  'multi_match',
  'order_match',
  'gap_match',
  'dictation_match',
  'writing_model',
  'speaking_model',
] as const;
export type EvaluatorKey = (typeof EVALUATORS)[number];

/**
 * `section`: the clock belongs to the section (IELTS Reading's hour).
 * `task`: each task has its own preparation and response window (PTE Read
 * Aloud's 35 seconds to prepare, 40 to speak).
 */
export type TimingRule =
  | { scope: 'section' }
  | { scope: 'task'; prepSeconds: number; responseSeconds: number };

/**
 * How a task's audio stimulus behaves. Absent means an ordinary player with a
 * full transport, which is what IELTS practice wants. PTE declares one play
 * and auto-start, and the stimulus renderer is what enforces it — a task
 * component deciding for itself is how the IELTS mock ended up with a
 * hardcoded `replayable` boolean.
 */
export type TaskAudioPolicy = {
  /** How many times the candidate may hear it. Every PTE audio task: 1. */
  plays: number;
  /** Begins on its own rather than waiting to be clicked. */
  autoplay: boolean;
  /** Silence before it begins, as the real test gives. */
  startDelaySeconds?: number;
};

export type ScoreScale = {
  /** What the number is called on this exam's own score report. */
  label: 'Band' | 'Score';
  min: number;
  max: number;
  step: number;
};

/**
 * How long a section runs. A range because most boards publish one: PTE's
 * Reading is 23-30 minutes depending on which version of the test you get.
 * `min` and `max` are equal where the length is fixed, as IELTS's are.
 *
 * Deliberately never summed into a test length — see `ExamDefinition.duration`.
 */
export type SectionMinutes = { min: number; max: number };

export type SectionDefinition = {
  key: string;
  label: string;
  skills: readonly Skill[];
  /** Null where the section is adaptive and its length varies. */
  minutes: SectionMinutes | null;
};

export type TaskDefinition = {
  key: string;
  label: string;
  section: string;
  stimulus: Stimulus;
  response: ResponseType;
  timing: TimingRule;
  /** Only for a task with audio, and only where the format constrains it. */
  audio?: TaskAudioPolicy;
  /**
   * The response length the format demands. A property of the task, not of the
   * item: PTE asks for 5-75 words in Summarize Written Text whatever the
   * passage is.
   */
  words?: { min: number; max: number };
  /**
   * How many items of this type a real sitting contains, as the board
   * publishes it. Absent where it does not: IELTS fixes its content in its own
   * tables, and an adaptive exam has no fixed count.
   */
  items?: { min: number; max: number };
  measuredSkills: readonly Skill[];
  renderer: RendererKey;
  evaluator: EvaluatorKey;
};

export type ExamDefinition = {
  key: ExamKey;
  name: string;
  /** The format version new attempts are stamped with. See `exam_version`. */
  version: string;
  /** Where the structure was taken from. The board's own specification. */
  source: string;
  /**
   * How long the whole test takes, in the board's own words.
   *
   * Carried rather than derived because the sections do not add up to it:
   * Pearson balances versions for total length, so the published ranges
   * deliberately over- and under-shoot, and summing them invents a number the
   * board never states.
   */
  duration: string;
  /** IELTS Academic/General; empty for exams without variants. */
  variants: readonly { key: string; label: string }[];
  scoreScale: ScoreScale;
  /**
   * The targets a candidate realistically sets, offered as choices at sign-up.
   * Narrower than the scale: nobody books IELTS aiming for Band 2.
   */
  targetRange: { min: number; max: number; step: number };
  sections: readonly SectionDefinition[];
  tasks: readonly TaskDefinition[];
};
