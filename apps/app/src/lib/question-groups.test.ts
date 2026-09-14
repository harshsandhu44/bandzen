import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupQuestions, pageGroups } from './question-groups.ts';

type Kind = Parameters<typeof groupQuestions>[0][number]['kind'];
const q = (idx: number, kind: Kind, sectionId?: string) => ({
  id: `q${idx}`,
  idx,
  kind,
  sectionId,
});
const shape = (qs: ReturnType<typeof q>[]) =>
  groupQuestions(qs).map((g) => [g.sectionId, g.kind, g.from, g.to]);

test('contiguous runs of a kind become one group each', () => {
  assert.deepEqual(
    shape([
      q(1, 'matching_headings'),
      q(2, 'matching_headings'),
      q(3, 'true_false_not_given'),
      q(4, 'true_false_not_given'),
      q(5, 'yes_no_not_given'),
    ]),
    [
      ['', 'matching_headings', 1, 2],
      ['', 'true_false_not_given', 3, 4],
      ['', 'yes_no_not_given', 5, 5],
    ],
  );
});

test('a passage boundary splits the same kind', () => {
  assert.deepEqual(
    shape([q(1, 'multiple_choice', 'p1'), q(2, 'multiple_choice', 'p2')]),
    [
      ['p1', 'multiple_choice', 1, 1],
      ['p2', 'multiple_choice', 2, 2],
    ],
  );
});

test('a kind that comes back later is a second group, order untouched', () => {
  const groups = groupQuestions([
    q(1, 'true_false_not_given'),
    q(2, 'multiple_choice'),
    q(3, 'true_false_not_given'),
  ]);
  assert.deepEqual(
    groups.map((g) => g.questions.map((x) => x.idx)),
    [[1], [2], [3]],
  );
});

test('section paging keeps every group of a passage on one page', () => {
  const groups = groupQuestions([
    q(1, 'matching', 't1'),
    q(2, 'multiple_choice', 't1'),
    q(3, 'matching', 't2'),
  ]);
  assert.equal(pageGroups(groups, 'group').length, 3);
  assert.deepEqual(
    pageGroups(groups, 'section').map((p) => p.length),
    [2, 1],
  );
});
