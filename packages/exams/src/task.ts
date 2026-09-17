import type {
  EvaluatorKey,
  RendererKey,
  ResponseType,
  SectionMinutes,
  Skill,
  Stimulus,
  TaskAudioPolicy,
  TaskDefinition,
  TaskScoring,
  TimingRule,
} from './types.ts';

export const SECTION_TIMED: TimingRule = { scope: 'section' };

/** A section's clock: one number where it is fixed, two where it varies. */
export const mins = (min: number, max = min): SectionMinutes => ({ min, max });

/** The word range a written task demands. Reads better than an 11th argument. */
export const withWords = (
  t: TaskDefinition,
  min: number,
  max: number,
): TaskDefinition => ({ ...t, words: { min, max } });

/** How many items of this type the real test runs. Same shape as `withWords`. */
export const withItems = (
  t: TaskDefinition,
  min: number,
  max = min,
): TaskDefinition => ({ ...t, items: { min, max } });

/** A model-graded task's published raw-scoring rules. Same shape as `withWords`. */
export const withScoring = (
  t: TaskDefinition,
  scoring: TaskScoring,
): TaskDefinition => ({ ...t, scoring });

/** Plays once, starts itself: every PTE audio task, and most of TOEFL's. */
export const ONE_PLAY: TaskAudioPolicy = { plays: 1, autoplay: true };

export const timed = (
  prepSeconds: number,
  responseSeconds: number,
): TimingRule => ({ scope: 'task', prepSeconds, responseSeconds });

/**
 * A task definition in one line of arguments. The definitions are long lists
 * of near-identical objects; positional arguments keep each one readable at a
 * glance, and the types still catch a transposed field.
 */
export function task(
  section: string,
  key: string,
  label: string,
  stimulus: Stimulus,
  response: ResponseType,
  renderer: RendererKey,
  evaluator: EvaluatorKey,
  measuredSkills: readonly Skill[],
  timing: TimingRule = SECTION_TIMED,
  audio?: TaskAudioPolicy,
): TaskDefinition {
  return {
    key,
    label,
    section,
    stimulus,
    response,
    timing,
    ...(audio ? { audio } : {}),
    measuredSkills,
    renderer,
    evaluator,
  };
}
