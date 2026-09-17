import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getExam, getTask } from './registry.ts';
import { taskContentIssues, type TaskContent } from './content.ts';

const empty: TaskContent = {
  prompt: 'Do the thing.',
  stimulus: { text: null, audioUrl: null, imageUrl: null, imageAlt: null },
  options: null,
  gapped: null,
  gapOptions: null,
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

const GAPPED = 'Open water ___ streets and slows ___ over ___.';

test('dropdown blanks need choices at every gap', () => {
  const complete = {
    stimulus: {
      text: 'A passage.',
      audioUrl: null,
      imageUrl: null,
      imageAlt: null,
    },
    gapped: GAPPED,
    gapOptions: [
      ['cools', 'heats'],
      ['flooding', 'traffic'],
      ['decades', 'minutes'],
    ],
  };
  const answer = ['cools', 'flooding', 'decades'];
  assert.deepEqual(
    check(
      'pte_academic',
      'reading_writing_fill_in_the_blanks',
      complete,
      { answer },
      'publish',
    ),
    [],
  );

  assert.ok(
    check(
      'pte_academic',
      'reading_writing_fill_in_the_blanks',
      { ...complete, gapOptions: null },
      { answer },
      'publish',
    ).some((i) => i.includes('one list of choices per gap (3)')),
  );

  assert.ok(
    check(
      'pte_academic',
      'reading_writing_fill_in_the_blanks',
      {
        ...complete,
        gapOptions: [
          ['cools'],
          ['flooding', 'traffic'],
          ['decades', 'minutes'],
        ],
      },
      { answer },
      'publish',
    ).some((i) => i.includes('at least two choices at every gap')),
  );

  // A gap whose key is not among its own choices can never be answered.
  assert.ok(
    check(
      'pte_academic',
      'reading_writing_fill_in_the_blanks',
      complete,
      { answer: ['warms', 'flooding', 'decades'] },
      'publish',
    ).some((i) => i.includes('among their gap')),
  );
});

test('a word bank must cover every gap, and may hold distractors', () => {
  const complete = {
    stimulus: {
      text: 'A passage.',
      audioUrl: null,
      imageUrl: null,
      imageAlt: null,
    },
    gapped: GAPPED,
    options: ['cools', 'flooding', 'decades', 'heats', 'traffic'],
  };
  const answer = ['cools', 'flooding', 'decades'];
  assert.deepEqual(
    check(
      'pte_academic',
      'reading_fill_in_the_blanks',
      complete,
      { answer },
      'publish',
    ),
    [],
  );

  assert.ok(
    check(
      'pte_academic',
      'reading_fill_in_the_blanks',
      { ...complete, options: ['cools', 'flooding'] },
      { answer },
      'publish',
    ).some((i) => i.includes('word bank covering every gap (3)')),
  );

  assert.ok(
    check(
      'pte_academic',
      'reading_fill_in_the_blanks',
      complete,
      { answer: ['cools', 'flooding', 'centuries'] },
      'publish',
    ).some((i) => i.includes('in the word bank')),
  );
});

test('marked-words answers are positions in the text', () => {
  const complete = {
    stimulus: {
      text: null,
      audioUrl: 'https://r2.test/a.mp3',
      imageUrl: null,
      imageAlt: null,
    },
    tokens: ['Open', 'water', 'warms', 'nearby', 'roads'],
  };
  const key = {
    answer: ['2', '4'],
    transcript: 'Open water cools nearby streets',
  };
  assert.deepEqual(
    check(
      'pte_academic',
      'highlight_incorrect_words',
      complete,
      key,
      'publish',
    ),
    [],
  );

  assert.ok(
    check(
      'pte_academic',
      'highlight_incorrect_words',
      { ...complete, tokens: ['Open'] },
      key,
      'publish',
    ).some((i) => i.includes('at least two words to mark')),
  );

  // A position past the end of the text can never be matched.
  assert.ok(
    check(
      'pte_academic',
      'highlight_incorrect_words',
      complete,
      { ...key, answer: ['2', '9'] },
      'publish',
    ).some((i) => i.includes('positions in the text')),
  );
  assert.ok(
    check(
      'pte_academic',
      'highlight_incorrect_words',
      complete,
      { ...key, answer: ['warms'] },
      'publish',
    ).some((i) => i.includes('positions in the text')),
  );
});

test('Answer Short Question needs its accepted answers, because code marks it', () => {
  const audio = {
    stimulus: {
      text: null,
      audioUrl: 'https://a/q.mp3',
      imageUrl: null,
      imageAlt: null,
    },
  };
  const transcript = 'What do you call a device that measures temperature?';
  assert.deepEqual(
    check(
      'pte_academic',
      'answer_short_question',
      audio,
      { transcript },
      'publish',
    ),
    ['the accepted answers'],
  );
  assert.deepEqual(
    check(
      'pte_academic',
      'answer_short_question',
      audio,
      { transcript, answer: ['thermometer'] },
      'publish',
    ),
    [],
  );
});
