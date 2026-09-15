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
  'reorder',
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

export type ScoreScale = {
  /** What the number is called on this exam's own score report. */
  label: 'Band' | 'Score';
  min: number;
  max: number;
  step: number;
};

export type SectionDefinition = {
  key: string;
  label: string;
  skills: readonly Skill[];
  /** Null where the section is adaptive and its length varies. */
  minutes: number | null;
};

export type TaskDefinition = {
  key: string;
  label: string;
  section: string;
  stimulus: Stimulus;
  response: ResponseType;
  timing: TimingRule;
  measuredSkills: readonly Skill[];
  renderer: RendererKey;
  evaluator: EvaluatorKey;
};

export type ExamDefinition = {
  key: ExamKey;
  name: string;
  /** The format version new attempts are stamped with. See `exam_version`. */
  version: string;
  /** Where the structure was taken from. */
  source: string;
  /** IELTS Academic/General; empty for exams without variants. */
  variants: readonly { key: string; label: string }[];
  scoreScale: ScoreScale;
  sections: readonly SectionDefinition[];
  tasks: readonly TaskDefinition[];
};
