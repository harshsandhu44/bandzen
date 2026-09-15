import type {
  EvaluatorKey,
  RendererKey,
  ResponseType,
  Skill,
  Stimulus,
  TaskDefinition,
  TimingRule,
} from './types.ts';

export const SECTION_TIMED: TimingRule = { scope: 'section' };

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
): TaskDefinition {
  return {
    key,
    label,
    section,
    stimulus,
    response,
    timing,
    measuredSkills,
    renderer,
    evaluator,
  };
}
