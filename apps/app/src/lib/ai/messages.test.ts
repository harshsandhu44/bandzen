import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSpeakingMessages, buildWritingMessages } from './messages.ts';

const clip = (promptId: string) => ({
  promptId,
  bytes: new Uint8Array([1, 2, 3]),
});

test('writing: rubric is first, so the prefix cache applies', () => {
  const [first] = buildWritingMessages({
    task: 2,
    promptText: 'Some prompt.',
    wordCount: 250,
    body: 'Some essay.',
  });
  assert.equal(first.role, 'system');
  assert.match(String(first.content), /^You are an experienced IELTS Writing/);
});

test('writing: the candidate response carries task, prompt and word count', () => {
  const [, user] = buildWritingMessages({
    task: 1,
    promptText: 'Describe the chart.',
    wordCount: 42,
    body: 'The chart shows.',
  });
  const content = String(user.content);
  assert.match(content, /^Task 1\./);
  assert.match(content, /Describe the chart\./);
  assert.match(content, /\(42 words\)/);
  assert.match(content, /The chart shows\./);
});

test('speaking: rubric first, response shape second', () => {
  const [rubric, shape] = buildSpeakingMessages([], []);
  assert.equal(rubric.role, 'system');
  assert.match(
    String(rubric.content),
    /^You are an experienced IELTS Speaking/,
  );
  assert.equal(shape.role, 'system');
  assert.match(String(shape.content), /Reply with ONE JSON object/);
});

test('speaking: each answered prompt is followed by its audio', () => {
  const [, , user] = buildSpeakingMessages(
    [{ promptId: 'p1', part: 1, text: 'Where are you from?' }],
    [clip('p1')],
  );
  const content = user.content as Array<{ type: string; text?: string }>;
  assert.equal(content.length, 2);
  assert.equal(content[0].type, 'text');
  assert.match(content[0].text!, /^Part 1 — examiner: Where are you from\?$/);
  assert.equal(content[1].type, 'input_audio');
});

test('speaking: an unanswered prompt becomes a visible gap, not an omission', () => {
  const [, , user] = buildSpeakingMessages(
    [
      { promptId: 'p1', part: 1, text: 'A' },
      { promptId: 'p2', part: 3, text: 'B' },
    ],
    [clip('p1')],
  );
  const content = user.content as Array<{ type: string; text?: string }>;
  // p1 text + p1 audio, p2 text + gap, then the coverage warning.
  assert.equal(content.length, 5);
  assert.equal(content[3].text, '[No response recorded for this prompt.]');
  assert.match(content[4].text!, /answered 1 of 2 prompts/);
  assert.match(content[2].text!, /^Part 3 \(discussion\)/);
});

test('speaking: a fully answered test gets no coverage warning', () => {
  const [, , user] = buildSpeakingMessages(
    [{ promptId: 'p1', part: 2, text: 'A' }],
    [clip('p1')],
  );
  const content = user.content as unknown[];
  assert.equal(content.length, 2);
});

test('speaking: prompts are walked in order, not clip order', () => {
  const [, , user] = buildSpeakingMessages(
    [
      { promptId: 'p1', part: 1, text: 'first' },
      { promptId: 'p2', part: 2, text: 'second' },
    ],
    [clip('p2'), clip('p1')],
  );
  const content = user.content as Array<{ text?: string }>;
  assert.match(content[0].text!, /first/);
  assert.match(content[2].text!, /second/);
});
