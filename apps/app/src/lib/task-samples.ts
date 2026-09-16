import type { TaskDefinition } from '@bandzen/exams/registry';
import type { StimulusData, TaskItem } from './task-content';

/**
 * Placeholder content for the staff task lab: one plausible item per renderer,
 * so every task type can be opened and answered end to end before real content
 * for it exists. Never shown to students.
 */

const PASSAGE =
  'Urban rivers were once buried under roads to make room for traffic. Several cities have since reopened them, finding that open water cools nearby streets, slows flooding and draws people back to neglected districts.\n\nThe work is expensive and slow, and the benefits arrive over decades rather than years.';

const CHART_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><rect width="320" height="180" fill="#f4f4f5"/><g fill="#2563eb"><rect x="40" y="90" width="40" height="70"/><rect x="110" y="50" width="40" height="110"/><rect x="180" y="110" width="40" height="50"/><rect x="250" y="30" width="40" height="130"/></g><g font-family="sans-serif" font-size="11" fill="#3f3f46" text-anchor="middle"><text x="60" y="175">2019</text><text x="130" y="175">2020</text><text x="200" y="175">2021</text><text x="270" y="175">2022</text><text x="160" y="18">River restorations per year</text></g></svg>`;

const IMAGE = {
  imageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(CHART_SVG)}`,
  imageAlt: 'Bar chart of river restorations per year, 2019 to 2022',
};

const CHOICES = [
  'Reopened rivers cool the streets around them.',
  'Burying rivers reduced flooding in most cities.',
  'The benefits of restoration appear within a year.',
  'Traffic increased after rivers were reopened.',
].map((label, i) => ({ value: String.fromCharCode(65 + i), label }));

export function sampleTask(
  task: TaskDefinition,
  audioUrl: string | null,
): { stimulus: StimulusData; item: TaskItem } {
  const stimulus: StimulusData =
    task.stimulus === 'text'
      ? { text: PASSAGE }
      : task.stimulus === 'audio'
        ? { audioUrl }
        : task.stimulus === 'image'
          ? IMAGE
          : { text: PASSAGE, audioUrl, ...IMAGE };

  const window =
    task.timing.scope === 'task'
      ? {
          prepSeconds: task.timing.prepSeconds,
          responseSeconds: task.timing.responseSeconds,
        }
      : { prepSeconds: 0, responseSeconds: 60 };

  const item: TaskItem = { prompt: `Sample: ${task.label}.` };
  switch (task.renderer) {
    case 'choice_cards':
    case 'choice_select':
      item.options = CHOICES;
      break;
    case 'multi_choice':
      item.prompt = 'Choose all the statements the source supports.';
      item.options = CHOICES;
      break;
    case 'fill_blank':
      item.gapped =
        'Open water ___ nearby streets and slows ___, but the benefits arrive over ___.';
      break;
    case 'fill_blank_select':
      item.gapped =
        'Open water ___ nearby streets and slows ___, but the benefits arrive over ___.';
      item.gapOptions = [
        ['cools', 'heats', 'widens'],
        ['flooding', 'traffic', 'planning'],
        ['decades', 'minutes', 'inches'],
      ];
      break;
    case 'fill_blank_drag':
      item.gapped =
        'Open water ___ nearby streets and slows ___, but the benefits arrive over ___.';
      // More words than gaps: the extras are the distractors.
      item.options = ['cools', 'flooding', 'decades', 'heats', 'traffic'].map(
        (w) => ({ value: w, label: w }),
      );
      break;
    case 'reorder':
      item.prompt = 'Put the paragraphs in order.';
      item.tokens = [
        'The work is expensive and slow.',
        'Urban rivers were once buried under roads.',
        'Several cities have since reopened them.',
        'The benefits arrive over decades.',
      ];
      break;
    case 'sentence_builder':
      item.prompt = 'Make a sentence from the words.';
      item.tokens = ['the', 'river', 'reopened', 'city', 'its'];
      break;
    case 'recording':
      Object.assign(item, window);
      break;
    case 'conversation':
      Object.assign(item, window);
      item.turns = [
        'Tell me about a place in your city you like to visit.',
        'Why do you think people value green spaces?',
        'Should cities spend more on parks than on roads?',
      ];
      break;
  }
  return { stimulus, item };
}
