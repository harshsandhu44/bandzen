import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pteSpeakingEvaluationSchema,
  pteWritingEvaluationSchema,
} from '@bandzen/ai/schemas';
import {
  buildPteSpeakingMessages,
  buildPteWritingMessages,
} from './messages.ts';
import { PTE_SPEAKING_RUBRIC, PTE_WRITING_RUBRIC } from './pte-rubrics.ts';

test('the rubric leads every PTE request, or prompt caching stops applying', () => {
  const writing = buildPteWritingMessages({
    taskLabel: 'Summarize Written Text',
    prompt: 'Summarise the passage in one sentence.',
    words: { min: 5, max: 75 },
    wordCount: 40,
    body: 'Cities that reopen buried rivers cool their streets.',
  });
  assert.equal(writing[0]!.role, 'system');
  assert.equal(writing[0]!.content, PTE_WRITING_RUBRIC);

  const speaking = buildPteSpeakingMessages({
    taskLabel: 'Read Aloud',
    prompt: 'Read the text aloud.',
    stimulusText: 'Urban rivers were once buried under roads.',
    transcript: null,
    audio: null,
  });
  assert.equal(speaking[0]!.role, 'system');
  assert.equal(speaking[0]!.content, PTE_SPEAKING_RUBRIC);
});

test('the required word range reaches the writing grader', () => {
  const [, user] = buildPteWritingMessages({
    taskLabel: 'Write Essay',
    prompt: 'Discuss.',
    words: { min: 200, max: 300 },
    wordCount: 120,
    body: 'Short.',
  });
  assert.match(String(user!.content), /200-300 words/);
  assert.match(String(user!.content), /120 words/);
});

test('a missing take is an explicit gap, never a silent omission', () => {
  const [, user] = buildPteSpeakingMessages({
    taskLabel: 'Repeat Sentence',
    prompt: 'Repeat the sentence.',
    stimulusText: null,
    transcript: 'The library closes at five.',
    audio: null,
  });
  const parts = user!.content as Array<{ type: string; text?: string }>;
  assert.ok(parts.some((p) => p.text?.includes('did not record an answer')));
  // The transcript is context for the grader, server-side only.
  assert.ok(parts.some((p) => p.text?.includes('The library closes at five.')));
});

test('PTE evaluations are traits out of five, not bands', () => {
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
      traits: [{ name: 'Fluency and Coherence', score: 4, comment: 'no' }],
      annotations: [],
      strengths: [],
      weaknesses: [],
    }),
  );
});
