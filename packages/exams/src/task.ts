import type {
  EvaluatorKey,
  RendererKey,
  ResponseType,
  Skill,
  Stimulus,
  TaskAudioPolicy,
  TaskDefinition,
  TimingRule,
} from './types.ts';

export const SECTION_TIMED: TimingRule = { scope: 'section' };

/** The word range a written task demands. Reads better than an 11th argument. */
export const withWords = (
  t: TaskDefinition,
  min: number,
  max: number,
): TaskDefinition => ({ ...t, words: { min, max } });

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
