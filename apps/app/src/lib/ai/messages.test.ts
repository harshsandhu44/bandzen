import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pteSpeakingEvaluationSchema,
  pteWritingEvaluationSchema,
} from '@bandzen/ai/schemas';
import { getExam } from '@bandzen/exams/registry';
import {
  buildPteSpeakingMessages,
  buildPteWritingMessages,
} from './messages.ts';
import { PTE_RUBRICS, pteRubricFor } from './pte-rubrics.ts';

test('the task rubric leads every PTE request, or prompt caching stops applying', () => {
  const writing = buildPteWritingMessages({
    taskType: 'summarize_written_text',
    taskLabel: 'Summarize Written Text',
    prompt: 'Summarise the passage in one sentence.',
    source: 'Urban rivers were once buried under roads.',
    traits: ['Content', 'Grammar', 'Vocabulary'],
    wordCount: 8,
    body: 'Cities that reopen buried rivers cool their streets.',
  });
  assert.equal(writing[0]!.role, 'system');
  assert.equal(writing[0]!.content, pteRubricFor('summarize_written_text'));

  const speaking = buildPteSpeakingMessages({
    taskType: 'describe_image',
    taskLabel: 'Describe Image',
    prompt: 'Describe the image.',
    stimulusText: null,
    transcript: null,
    traits: ['Content', 'Pronunciation', 'Oral fluency'],
    audio: new Uint8Array([1, 2, 3]),
  });
  assert.equal(speaking[0]!.role, 'system');
  assert.equal(speaking[0]!.content, pteRubricFor('describe_image'));
  // The per-task response shape goes last, below the cached prefix.
  assert.match(String(speaking.at(-1)!.content), /"Oral fluency"/);
});

test('every model-graded PTE task has a rubric naming each trait it asks for', () => {
  const pte = getExam('pte_academic')!;
  for (const task of pte.tasks.filter((t) =>
    t.scoring?.traits.some((trait) => trait.source === 'model'),
  )) {
    const rubric = pteRubricFor(task.key);
    for (const trait of task.scoring!.traits) {
      if (trait.source !== 'model') continue;
      assert.match(
        rubric,
        new RegExp(`## ${trait.key} \\(0-${trait.max}\\)`),
        `${task.key}: ${trait.key}`,
      );
    }
    // Code marks these; a rubric scale for them invites the model to.
    for (const trait of task.scoring!.traits) {
      if (trait.source === 'model') continue;
      assert.doesNotMatch(
        rubric,
        new RegExp(`## ${trait.key} \\(`),
        `${task.key}: ${trait.key}`,
      );
    }
  }
  assert.equal(PTE_RUBRICS.answer_short_question, undefined);
  assert.throws(() => pteRubricFor('reorder_paragraphs'), /No PTE rubric/);
});

test('the source reaches the summary grader', () => {
  const [, user] = buildPteWritingMessages({
    taskType: 'summarize_spoken_text',
    taskLabel: 'Summarize Spoken Text',
    prompt: 'Summarise the lecture.',
    source: 'The lecture was about glaciers.',
    traits: ['Content'],
    wordCount: 55,
    body: 'Glaciers.',
  });
  assert.match(String(user!.content), /The lecture was about glaciers\./);
  assert.match(String(user!.content), /55 words/);
});

test('PTE evaluations carry named traits, not bands', () => {
  const writing = pteWritingEvaluationSchema.parse({
    traits: [{ name: 'Content', score: 4, comment: 'Covers the key points.' }],
    annotations: [],
    strengths: ['Accurate'],
    weaknesses: ['Long'],
  });
  assert.equal(writing.traits[0]!.score, 4);

  const speaking = pteSpeakingEvaluationSchema.parse({
    traits: [{ name: 'Oral fluency', score: 3, comment: 'Some hesitation.' }],
    annotations: [],
    strengths: [],
    weaknesses: [],
  });
  assert.equal(speaking.traits[0]!.name, 'Oral fluency');

  assert.throws(() =>
    pteWritingEvaluationSchema.parse({
      band: 7,
      annotations: [],
      strengths: [],
      weaknesses: [],
    }),
  );
});
