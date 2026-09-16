import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getExam, getTask } from '@bandzen/exams/registry';
import type { TaskContent } from '@bandzen/exams/content';
import {
  runnerItems,
  sessionMinutes,
  type SavedTaskRow,
} from './task-session.ts';

const content = (over: Partial<TaskContent> = {}): TaskContent => ({
  prompt: 'Restore the original order.',
  stimulus: {
    text: 'A short article.',
    audioUrl: null,
    imageUrl: null,
    imageAlt: null,
  },
  options: null,
  gapped: null,
  gapOptions: null,
  tokens: ['second', 'first'],
  turns: null,
  timing: null,
  difficulty: 3,
  ...over,
});

const row = (over: Partial<SavedTaskRow> = {}): SavedTaskRow => ({
  taskId: 'a',
  content: content(),
  value: null,
  audioUrl: null,
  ...over,
});

test('an untouched item restores as an empty answer, never undefined', () => {
  const task = getTask('pte_academic', 'reorder_paragraphs')!;
  const [item] = runnerItems(task, [row()]);
  assert.equal(item!.value, '');
  assert.equal(item!.item.prompt, 'Restore the original order.');
});

test('an answered item restores its stored value', () => {
  const task = getTask('pte_academic', 'reorder_paragraphs')!;
  const [item] = runnerItems(task, [row({ value: '["1","0"]' })]);
  assert.equal(item!.value, '["1","0"]');
});

test('a recording restores from its uploaded url, not its value', () => {
  const task = getTask('pte_academic', 'read_aloud')!;
  const [item] = runnerItems(task, [
    row({ value: null, audioUrl: 'https://r2.test/take.wav' }),
  ]);
  assert.equal(item!.value, 'https://r2.test/take.wav');
});

test('the answer key never reaches the runner', () => {
  const task = getTask('pte_academic', 'reorder_paragraphs')!;
  const [item] = runnerItems(task, [row()]);
  assert.equal('answer' in item!.item, false);
  assert.equal('transcript' in item!.item, false);
});

test('a written task-timed session adds its items up; a section-timed one is untimed', () => {
  const pte = getExam('pte_academic')!;
  // Summarize Written Text: ten minutes each.
  assert.equal(
    sessionMinutes(pte, getTask('pte_academic', 'summarize_written_text')!, 2),
    20,
  );
  assert.equal(
    sessionMinutes(pte, getTask('pte_academic', 'reorder_paragraphs')!, 3),
    null,
  );
});

test('a recording task has no page clock — the recorder owns its window', () => {
  const pte = getExam('pte_academic')!;
  // With one, Repeat Sentence's fifteen seconds auto-submitted the task before
  // the candidate could begin speaking.
  assert.equal(
    sessionMinutes(pte, getTask('pte_academic', 'read_aloud')!, 4),
    null,
  );
  assert.equal(
    sessionMinutes(pte, getTask('pte_academic', 'repeat_sentence')!, 1),
    null,
  );
});
