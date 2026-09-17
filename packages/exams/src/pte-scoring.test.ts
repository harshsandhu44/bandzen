import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTask } from './registry.ts';
import {
  answerShortQuestion,
  formScore,
  pteScoreReport,
  pteSkillFractions,
  pteWeakestTaskTypes,
  readAloudContent,
  repeatSentenceContent,
  scoreItem,
  taskFraction,
  type TaskOutcome,
} from './pte-scoring.ts';

const objective = (
  taskType: string,
  correct: number,
  total: number,
  skills: TaskOutcome['measuredSkills'],
): TaskOutcome => ({
  taskType,
  dimensions: { correct, total },
  measuredSkills: skills,
});

const contract = (taskType: string) =>
  getTask('pte_academic', taskType)!.scoring!;

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');

test('marks become a fraction of what the task was worth', () => {
  assert.equal(taskFraction(objective('reorder_paragraphs', 2, 4, [])), 0.5);
  // A model-graded task is written as points of total by its grader too.
  assert.equal(taskFraction(objective('write_essay', 13, 26, [])), 0.5);
});

test('traits alone are not a score: no universal rubric averages them', () => {
  // The v1 arithmetic read this as 5/5 and 3/5 averaged. Without the task's
  // own maxima and gates there is no honest fraction to give.
  assert.equal(
    taskFraction({
      taskType: 'write_essay',
      dimensions: { Content: 5, Form: 3 },
      measuredSkills: [],
    }),
    null,
  );
});

test('Answer Short Question is one point or none, with no speaking traits', () => {
  const asq = contract('answer_short_question');
  assert.equal(asq.mode, 'binary');
  assert.deepEqual(
    asq.traits.map((t) => t.key),
    ['Vocabulary'],
  );
  assert.equal(answerShortQuestion(['thermometer'], "It's a thermometer."), 1);
  assert.equal(answerShortQuestion(['thermometer'], 'a barometer'), 0);
  // Part of a word is not the word.
  assert.equal(answerShortQuestion(['meter'], 'thermometer'), 0);
  assert.deepEqual(scoreItem(asq, { Vocabulary: 1 }), { points: 1, max: 1 });
  assert.deepEqual(scoreItem(asq, { Vocabulary: 0 }), { points: 0, max: 1 });
});

test('Describe Image with Content 0 scores nothing, however fluent', () => {
  assert.deepEqual(
    scoreItem(contract('describe_image'), {
      Content: 0,
      'Oral fluency': 5,
      Pronunciation: 5,
    }),
    { points: 0, max: 16 },
  );
  assert.deepEqual(
    scoreItem(contract('describe_image'), {
      Content: 4,
      'Oral fluency': 3,
      Pronunciation: 5,
    }),
    { points: 12, max: 16 },
  );
});

test('Summarize Written Text: Content 4, Form 1, Grammar and Vocabulary 2', () => {
  const swt = contract('summarize_written_text');
  assert.deepEqual(
    swt.traits.map((t) => [t.key, t.max]),
    [
      ['Content', 4],
      ['Form', 1],
      ['Grammar', 2],
      ['Vocabulary', 2],
    ],
  );
  const full = { Content: 4, Form: 1, Grammar: 2, Vocabulary: 2 };
  assert.deepEqual(scoreItem(swt, full), { points: 9, max: 9 });
  // Form 0 voids the response, and the grader need not be asked at all.
  assert.deepEqual(scoreItem(swt, { Form: 0 }), { points: 0, max: 9 });
  // A scale overshoot is clamped to what the trait is worth.
  assert.deepEqual(scoreItem(swt, { ...full, Grammar: 5 }), {
    points: 9,
    max: 9,
  });

  assert.equal(
    formScore(
      'summarize_written_text',
      'Cities that uncover buried rivers cool their streets and draw people back.',
    ),
    1,
  );
  assert.equal(
    formScore('summarize_written_text', 'Rivers cool cities. People return.'),
    0,
  );
  assert.equal(formScore('summarize_written_text', 'Too short.'), 0);
  assert.equal(formScore('summarize_written_text', `${words(76)}.`), 0);
  assert.equal(
    formScore(
      'summarize_written_text',
      'CITIES THAT UNCOVER RIVERS ARE COOLER.',
    ),
    0,
  );
});

test('Write Essay under 120 words has Form 0 and no task score', () => {
  const essay = contract('write_essay');
  assert.equal(formScore('write_essay', `${words(119)}.`), 0);
  assert.equal(formScore('write_essay', `${words(120)}.`), 1);
  assert.equal(formScore('write_essay', `${words(250)}.`), 2);
  assert.equal(formScore('write_essay', `${words(381)}.`), 0);
  assert.equal(formScore('write_essay', words(250)), 0, 'no punctuation');
  assert.deepEqual(scoreItem(essay, { Form: 0, Content: 6 }), {
    points: 0,
    max: 26,
  });
});

test('Summarize Spoken Text Form follows its own word bands', () => {
  assert.equal(formScore('summarize_spoken_text', `${words(60)}.`), 2);
  assert.equal(formScore('summarize_spoken_text', `${words(45)}.`), 1);
  assert.equal(formScore('summarize_spoken_text', `${words(39)}.`), 0);
  assert.equal(
    formScore('summarize_spoken_text', `- ${words(30)}.\n- ${words(30)}.`),
    0,
    'bullet points',
  );
});

test('Repeat Sentence Content is 0-3 by words said in sequence', () => {
  const sentence = 'The library closes early on public holidays';
  assert.equal(repeatSentenceContent(sentence, sentence), 3);
  // Hesitations and trailing material do not cost Content.
  assert.equal(
    repeatSentenceContent(
      sentence,
      'um the library closes early on public holidays yes',
    ),
    3,
  );
  assert.equal(repeatSentenceContent(sentence, 'the library closes early'), 2);
  // Out of order is not in sequence.
  assert.equal(
    repeatSentenceContent(sentence, 'holidays public on the library'),
    1,
  );
  assert.equal(repeatSentenceContent(sentence, 'hello'), 0);
  assert.equal(contract('repeat_sentence').traits[0]!.max, 3);
});

test('Read Aloud Content is a point per word, less one per error', () => {
  const text = 'Urban rivers were once buried under roads';
  assert.deepEqual(readAloudContent(text, text), { score: 7, max: 7 });
  // One omission, one replacement, one insertion.
  assert.deepEqual(
    readAloudContent(text, 'Urban rivers were buried below the roads'),
    { score: 4, max: 7 },
  );
  assert.deepEqual(
    scoreItem(
      contract('read_aloud'),
      { Content: 7, 'Oral fluency': 5, Pronunciation: 5 },
      7,
    ),
    { points: 17, max: 17 },
  );
});

test('a task nobody marked is not a task marked zero', () => {
  assert.equal(
    taskFraction({ taskType: 'x', dimensions: {}, measuredSkills: [] }),
    null,
  );
  assert.equal(
    taskFraction({
      taskType: 'x',
      dimensions: { Content: null },
      measuredSkills: [],
    }),
    null,
  );
  // An objective task whose marking failed: the denominator is there, the
  // numerator is not. Scored 0/10 before, which reads as ten wrong answers.
  assert.equal(
    taskFraction({
      taskType: 'x',
      dimensions: { correct: null, total: 10 },
      measuredSkills: [],
    }),
    null,
  );
  // And none of that swallows a real zero.
  assert.equal(
    taskFraction({
      taskType: 'x',
      dimensions: { correct: 0, total: 10 },
      measuredSkills: [],
    }),
    0,
  );
});

test('an integrated task counts towards every skill it measures', () => {
  // Repeat Sentence is credited to listening and speaking, half each — one of
  // the eight types the score guide scores against two skills at once.
  const fractions = pteSkillFractions([
    objective('repeat_sentence', 13, 13, [
      { skill: 'listening', weight: 0.5 },
      { skill: 'speaking', weight: 0.5 },
    ]),
  ]);
  assert.equal(fractions.listening, 1);
  assert.equal(fractions.speaking, 1);
  // Nothing measured these, so they are unknown rather than zero.
  assert.equal(fractions.reading, null);
  assert.equal(fractions.writing, null);
});

test('the estimate lands on PTE’s own scale, and only for skills it measured', () => {
  const report = pteScoreReport([
    objective('reorder_paragraphs', 4, 4, [{ skill: 'reading', weight: 1 }]),
  ]);
  assert.equal(report.scale.min, 10);
  assert.equal(report.scale.max, 90);
  assert.equal(report.estimated, true);
  assert.equal(report.subscores?.reading, 90);
  assert.equal(report.subscores?.listening, null);
  // The overall is the mean of what was measured, not of four assumed skills.
  assert.equal(report.overall, 90);
  assert.equal(report.sections?.reading, 90);
  assert.equal(report.sections?.listening, null);
});

test('a half-right sitting lands mid-scale, not at zero', () => {
  const report = pteScoreReport([
    objective('reorder_paragraphs', 2, 4, [{ skill: 'reading', weight: 1 }]),
  ]);
  // 10 + 0.5 x 80 = 50.
  assert.equal(report.overall, 50);
});

test('the weakest task types come first, for a plan to point at', () => {
  const weakest = pteWeakestTaskTypes([
    objective('reorder_paragraphs', 4, 4, []),
    objective('write_from_dictation', 1, 4, []),
    objective('reading_multiple_choice_single', 2, 4, []),
  ]);
  assert.deepEqual(
    weakest.map((w) => w.taskType),
    [
      'write_from_dictation',
      'reading_multiple_choice_single',
      'reorder_paragraphs',
    ],
  );
});
