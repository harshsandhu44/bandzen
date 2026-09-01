import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  MAX_ITEMS,
  findSlugClashes,
  lessonSchema,
  parseItems,
  passageSchema,
  resourceSchema,
  writingPromptSchema,
  type ParseResult,
} from './schemas.ts';

/**
 * The assertion that earns this file: the import schemas parse the real
 * content sitting in apps/app/content. Those files are what the generation
 * pipeline emits and what anyone will actually drag into the form, so a schema
 * that has drifted from them fails here rather than at the upload.
 *
 * Lessons and resources have no on-disk files to check -- they were TypeScript
 * literals before the CMS existed -- so their coverage is hand-written, and
 * shaped after the example in their template.
 */
const CONTENT = join(import.meta.dirname, '../../../../../app/content');

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

/** Unwraps a successful parse, failing the test with the parse error if not. */
function items<T>(result: ParseResult<T>): T[] {
  if ('error' in result) assert.fail(result.error);
  return result.items;
}

/** The mirror image: unwraps the error, failing if the parse succeeded. */
function error<T>(result: ParseResult<T>): string {
  if (!('error' in result)) assert.fail('expected a parse error');
  return result.error;
}

test('the passage schema parses every generated passage on disk', () => {
  const files = readdirSync(join(CONTENT, 'passages')).filter((f) =>
    f.endsWith('.json'),
  );
  assert.ok(files.length > 0, 'expected generated passages to check against');

  for (const file of files) {
    const parsed = items(
      parseItems(passageSchema, readJson(join(CONTENT, 'passages', file))),
    );
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].questions.length, 13);
  }
});

test('the writing prompt schema parses content/prompts.json', () => {
  const parsed = items(
    parseItems(writingPromptSchema, readJson(join(CONTENT, 'prompts.json'))),
  );
  assert.ok(parsed.length > 0);
});

test('a bare object and a one-item array both come out as one item', () => {
  const item = { slug: 'a', task: 2, promptText: 'Discuss both views.' };
  for (const json of [item, [item]]) {
    assert.deepEqual(
      items(parseItems(writingPromptSchema, json)).map((i) => i.slug),
      ['a'],
    );
  }
});

test('a bare object reports its own field, not an array index', () => {
  const message = error(
    parseItems(writingPromptSchema, { slug: 'a', task: 2 }),
  );
  assert.match(message, /^promptText:/);
});

test('more than the cap is refused', () => {
  const many = Array.from({ length: MAX_ITEMS + 1 }, (_, i) => ({
    slug: `s${i}`,
    task: 2,
    promptText: 'x',
  }));
  assert.match(
    error(parseItems(writingPromptSchema, many)),
    /import at most 50 at a time/,
  );
});

test('a lesson with stages and every block kind parses', () => {
  const parsed = items(
    parseItems(lessonSchema, {
      slug: 'skimming-for-gist',
      module: 'reading',
      group: 'foundations',
      title: 'Skimming for gist',
      summary: 'Read fast.',
      minutes: 8,
      questionKind: null,
      stages: [
        {
          id: 'understand',
          blocks: [
            { kind: 'prose', body: 'p' },
            { kind: 'steps', items: ['a'] },
            { kind: 'checklist', items: ['a'] },
            { kind: 'callout', tone: 'warning', title: 't', body: 'b' },
            {
              kind: 'example',
              source: 's',
              question: 'q',
              answer: 'a',
              why: 'w',
            },
            { kind: 'try', question: 'q', answer: 'a', why: 'w' },
          ],
        },
      ],
    }),
  );
  assert.equal(parsed[0].stages?.[0].blocks.length, 6);
});

test('an unwritten lesson -- no stages at all -- is legal', () => {
  const parsed = items(
    parseItems(lessonSchema, {
      slug: 'planned',
      module: 'writing',
      group: 'advanced',
      title: 'Planned',
      summary: 'Not written yet.',
      minutes: 5,
    }),
  );
  assert.equal(parsed[0].stages, undefined);
});

test('an unknown block kind is rejected', () => {
  error(
    parseItems(lessonSchema, {
      slug: 'bad',
      module: 'reading',
      group: 'foundations',
      title: 'Bad',
      summary: 's',
      minutes: 5,
      stages: [{ id: 'understand', blocks: [{ kind: 'video', url: 'x' }] }],
    }),
  );
});

test('a resource carries its paragraphs', () => {
  const parsed = items(
    parseItems(resourceSchema, {
      slug: 'managing-the-reading-clock',
      title: 'Managing the reading clock',
      summary: 'Sixty minutes, three passages.',
      category: 'strategies',
      level: 'intermediate',
      minutes: 6,
      module: 'reading',
      questionKind: null,
      orderIndex: 2,
      body: ['one', 'two'],
    }),
  );
  assert.deepEqual(parsed[0].body, ['one', 'two']);
});

test('clashes cover both existing slugs and repeats within the file', () => {
  assert.deepEqual(findSlugClashes(['a', 'b', 'b', 'c'], new Set(['c', 'z'])), [
    'b',
    'c',
  ]);
  assert.deepEqual(findSlugClashes(['a', 'b'], new Set(['z'])), []);
});
