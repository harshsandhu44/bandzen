import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getExam, getTask } from './registry.ts';
import { taskContentIssues, type TaskContent } from './content.ts';

const empty: TaskContent = {
  prompt: 'Do the thing.',
  stimulus: { text: null, audioUrl: null, imageUrl: null, imageAlt: null },
  options: null,
  gapped: null,
  tokens: null,
  turns: null,
  timing: null,
  difficulty: 3,
};

const check = (
  exam: string,
  taskKey: string,
  content: Partial<TaskContent>,
  key: { answer?: string[] | null; transcript?: string | null },
  stage: 'import' | 'publish',
) =>
  taskContentIssues(
    getExam(exam)!,
    getTask(exam, taskKey)!,
    {
      ...empty,
      ...content,
      stimulus: { ...empty.stimulus, ...content.stimulus },
    },
    { answer: key.answer ?? null, transcript: key.transcript ?? null },
    stage,
  );

test('a complete reorder item passes both stages', () => {
  const content = {
    stimulus: {
      text: 'A passage.',
      audioUrl: null,
      imageUrl: null,
      imageAlt: null,
    },
    tokens: ['First.', 'Second.', 'Third.'],
  };
  assert.deepEqual(
    check(
      'pte_academic',
      'reorder_paragraphs',
      content,
      { answer: ['1', '0', '2'] },
      'import',
    ),
    [],
  );
  assert.deepEqual(
    check(
      'pte_academic',
      'reorder_paragraphs',
      content,
      { answer: ['1', '0', '2'] },
      'publish',
    ),
    [],
  );
});

test('an answer key is only demanded at publish, and must fit the task', () => {
  const content = {
    stimulus: {
      text: 'A passage.',
      audioUrl: null,
      imageUrl: null,
      imageAlt: null,
    },
    tokens: ['First.', 'Second.'],
  };
  assert.deepEqual(
    check('pte_academic', 'reorder_paragraphs', content, {}, 'import'),
    [],
  );
  assert.deepEqual(
    check('pte_academic', 'reorder_paragraphs', content, {}, 'publish'),
    ['an answer key'],
  );
  assert.deepEqual(
    check(
      'pte_academic',
      'reorder_paragraphs',
      content,
      { answer: ['0', '0'] },
      'import',
    ),
    ['an order that uses every piece exactly once'],
  );
});

test('gaps, choices and dictation answers are checked against the item', () => {
  assert.deepEqual(
    check(
      'det',
      'read_and_complete',
      {
        stimulus: { text: 'x', audioUrl: null, imageUrl: null, imageAlt: null },
        gapped: 'a ___ b ___',
      },
      { answer: ['one'] },
      'import',
    ),
    ['one answer per gap (2)'],
  );
  assert.deepEqual(
    check(
      'toefl_ibt',
      'read_in_daily_life',
      {
        stimulus: { text: 'x', audioUrl: null, imageUrl: null, imageAlt: null },
        options: ['A', 'B'],
      },
      { answer: ['C'] },
      'import',
    ),
    ['answers that are among the options'],
  );
  assert.deepEqual(
    check(
      'pte_academic',
      'write_from_dictation',
      {
        stimulus: {
          text: null,
          audioUrl: 'https://a/b.mp3',
          imageUrl: null,
          imageAlt: null,
        },
      },
      { answer: ['one', 'two'], transcript: 'one two' },
      'publish',
    ),
    ['the sentence as the only answer'],
  );
});

test('assets: audio may arrive as a transcript, but publishing needs the audio', () => {
  const content = { prompt: 'Repeat it.' };
  assert.deepEqual(
    check(
      'pte_academic',
      'repeat_sentence',
      content,
      { transcript: 'Say this.' },
      'import',
    ),
    [],
  );
  assert.deepEqual(
    check(
      'pte_academic',
      'repeat_sentence',
      content,
      { transcript: 'Say this.' },
      'publish',
    ),
    ['audio'],
  );
  assert.deepEqual(
    check(
      'pte_academic',
      'repeat_sentence',
      {
        stimulus: {
          text: null,
          audioUrl: 'https://a/b.mp3',
          imageUrl: null,
          imageAlt: null,
        },
      },
      {},
      'publish',
    ),
    ['a transcript for the audio'],
  );
});

test('an image needs the image and alt text; a graded task takes no key', () => {
  assert.deepEqual(check('det', 'speak_about_the_photo', {}, {}, 'publish'), [
    'an image',
    'alt text for the image',
  ]);
  assert.deepEqual(
    check(
      'det',
      'speak_about_the_photo',
      {
        stimulus: {
          text: null,
          audioUrl: null,
          imageUrl: 'https://a/p.png',
          imageAlt: 'A market',
        },
      },
      { answer: ['x'] },
      'import',
    ),
    ['no answer key (a grader marks this task)'],
  );
  assert.deepEqual(
    check(
      'toefl_ibt',
      'take_an_interview',
      {
        stimulus: {
          text: null,
          audioUrl: null,
          imageUrl: null,
          imageAlt: null,
        },
      },
      { transcript: 'Hello' },
      'import',
    ),
    ['at least one examiner turn'],
  );
});
