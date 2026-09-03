import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  lessonSchema,
  listeningTrackSchema,
  speakingTestSchema,
  parseItems,
  passageSchema,
  resourceSchema,
  writingPromptSchema,
  type ParseResult,
} from './schemas.ts';
import {
  LESSON_TEMPLATES,
  LISTENING_TEMPLATES,
  SPEAKING_TEMPLATES,
  PASSAGE_TEMPLATES,
  RESOURCE_TEMPLATES,
  TEMPLATES,
  WRITING_PROMPT_TEMPLATES,
} from './templates.ts';

/**
 * Every worked example, parsed against the schema it teaches.
 *
 * A model copies the example far more faithfully than it follows the rules, so
 * an example that does not satisfy its own schema is the worst bug this
 * directory can carry -- and it would show up as a mystifying import failure
 * long after the template was written.
 *
 * The examples are typed in templates.ts, so the compiler catches a missing
 * field. What it cannot catch is a value that is legal for the type and wrong
 * for the variant: a `listening` example filed under `speaking`, an example
 * question of the wrong kind, a Task 2 prompt filed under Task 1. That is what
 * the per-variant assertions below are for.
 */

/** The example is the JSON at the end of a rendered template. */
function exampleFrom(template: string): unknown {
  const start = template.indexOf('\n[\n');
  assert.notEqual(start, -1, 'template has no JSON example block');
  return JSON.parse(template.slice(start));
}

function items<T>(result: ParseResult<T>): T[] {
  if ('error' in result) assert.fail(result.error);
  return result.items;
}

test('every entity offers General first', () => {
  for (const [entity, options] of Object.entries(TEMPLATES)) {
    assert.equal(options[0].key, 'general', entity);
    assert.ok(options.length > 1, `${entity} has no variants`);
  }
});

test('every template is non-empty and carries its rules and its example', () => {
  for (const [entity, options] of Object.entries(TEMPLATES)) {
    for (const option of options) {
      assert.ok(option.label, `${entity}/${option.key} has no label`);
      assert.ok(
        option.template.length > 400,
        `${entity}/${option.key} looks truncated`,
      );
      assert.ok(
        option.template.includes('Return JSON only.'),
        `${entity}/${option.key} lost its base rules`,
      );
      // Parses, and is an array -- what the reader is asked to send back.
      assert.ok(Array.isArray(exampleFrom(option.template)));
    }
  }
});

for (const option of PASSAGE_TEMPLATES) {
  test(`passages/${option.key}: the example is a valid passage`, () => {
    const [passage] = items(
      parseItems(passageSchema, exampleFrom(option.template)),
    );

    // Every evidence sentence really is in the body. This is the rule the
    // template insists on hardest, so the example had better keep it.
    for (const q of passage.questions) {
      assert.ok(
        passage.body.includes(q.evidence),
        `idx ${q.idx}: evidence is not verbatim in body`,
      );
    }

    if (option.key === 'general') {
      const kinds = new Set(passage.questions.map((q) => q.kind));
      assert.ok(kinds.size >= 3, 'the general example should mix three kinds');
      return;
    }

    // A variant leads with its own kind and still shows the mix.
    assert.equal(passage.questions[0].kind, option.key);
    assert.ok(
      passage.questions.some((q) => q.kind !== option.key),
      'a variant example should still show another kind',
    );
    assert.ok(
      option.template.includes(`${option.key} rules:`),
      'the kind rules are missing from the template',
    );
  });
}

test('the matching-headings example has more headings than it consumes', () => {
  const option = PASSAGE_TEMPLATES.find((t) => t.key === 'matching_headings');
  assert.ok(option);
  const [passage] = items(
    parseItems(passageSchema, exampleFrom(option.template)),
  );

  const used = passage.questions.filter((q) => q.kind === 'matching_headings');
  assert.ok(
    passage.headings.length >= used.length + 3,
    'at least three more headings than questions, per the rules',
  );
  assert.equal(
    new Set(used.map((q) => q.answer[0])).size,
    used.length,
    'no heading may answer two questions',
  );
  for (const q of used) {
    assert.ok(
      passage.headings.includes(q.answer[0]),
      `"${q.answer[0]}" is not in the passage headings list`,
    );
  }
});

test('every multiple-choice example offers four options and one of them is the answer', () => {
  for (const option of PASSAGE_TEMPLATES) {
    const [passage] = items(
      parseItems(passageSchema, exampleFrom(option.template)),
    );
    for (const q of passage.questions) {
      if (q.kind !== 'multiple_choice') continue;
      assert.equal(q.options?.length, 4, `${option.key} idx ${q.idx}`);
      assert.ok(
        q.options?.includes(q.answer[0]),
        `${option.key} idx ${q.idx}: the answer matches no option`,
      );
    }
  }
});

for (const option of LISTENING_TEMPLATES) {
  test(`listening/${option.key}: the example is a valid track`, () => {
    const [track] = items(
      parseItems(listeningTrackSchema, exampleFrom(option.template)),
    );

    // A template example always ships a full track — transcript, audio, the
    // lot — even though import allows a row with only one of the two.
    assert.ok(track.transcript, 'the example needs a transcript');
    assert.ok(track.audioUrl, 'the example needs an audioUrl');

    // Evidence is the rule the template leans on hardest.
    for (const q of track.questions) {
      assert.ok(
        track.transcript.includes(q.evidence),
        `idx ${q.idx}: evidence is not verbatim in the transcript`,
      );
    }

    // Every matching answer comes from the shared list, and no option is
    // spent twice.
    const matching = track.questions.filter((q) => q.kind === 'matching');
    const options = track.matchingOptions ?? [];
    const usedAnswers = new Set<string>();
    for (const q of matching) {
      assert.ok(
        options.includes(q.answer[0]),
        `idx ${q.idx}: "${q.answer[0]}" is not in matchingOptions`,
      );
      assert.ok(!usedAnswers.has(q.answer[0]), `idx ${q.idx}: reused option`);
      usedAnswers.add(q.answer[0]);
    }
    if (matching.length > 0) {
      assert.ok(
        options.length >= matching.length + 3,
        'at least three spare matching options, per the rules',
      );
    }

    const kinds = new Set(track.questions.map((q) => q.kind));
    assert.ok(kinds.size >= 2, 'a track example should mix at least two kinds');

    if (option.key === 'matching') {
      assert.equal(track.questions[0].kind, 'matching');
    }
  });
}

for (const option of SPEAKING_TEMPLATES) {
  test(`speaking/${option.key}: the example is a valid test`, () => {
    const [spk] = items(
      parseItems(speakingTestSchema, exampleFrom(option.template)),
    );

    for (const part of [1, 2, 3]) {
      assert.ok(
        spk.prompts.some((p) => p.part === part),
        `the example needs a Part ${part} prompt`,
      );
    }
    const p2 = spk.prompts.filter((p) => p.part === 2);
    assert.equal(p2.length, 1, 'exactly one Part 2 prompt');
    assert.ok(
      p2[0].cueCardPoints && p2[0].cueCardPoints.length >= 3,
      'the Part 2 cue card needs at least three points',
    );
    assert.equal(p2[0].prepSeconds, 60, 'Part 2 has 60s of prep');

    const idxs = spk.prompts.map((p) => p.idx);
    assert.deepEqual(
      idxs,
      [...idxs].sort((a, b) => a - b),
      'prompts are in idx order',
    );
  });
}

for (const option of WRITING_PROMPT_TEMPLATES) {
  test(`writing-prompts/${option.key}: the example is a valid prompt`, () => {
    const [prompt] = items(
      parseItems(writingPromptSchema, exampleFrom(option.template)),
    );

    if (option.key === 'general') return;
    assert.equal(prompt.task, option.key === 'task2' ? 2 : 1);
    if (option.key === 'task1-general') {
      assert.equal(prompt.format, 'general');
      assert.match(prompt.promptText, /at least 150 words/);
    }
    if (option.key === 'task1-academic') {
      assert.equal(prompt.format, 'academic');
      assert.ok(
        prompt.chartData,
        'the academic Task 1 example should carry a figure',
      );
    }
    if (option.key === 'task2') {
      assert.match(prompt.promptText, /at least 250 words/);
    }
  });
}

for (const option of LESSON_TEMPLATES) {
  test(`lessons/${option.key}: the example is a valid lesson`, () => {
    const [lesson] = items(
      parseItems(lessonSchema, exampleFrom(option.template)),
    );
    assert.ok(lesson.stages?.length, 'a template example should be written');

    if (option.key === 'general') return;
    assert.equal(lesson.group, option.key);

    // The rule each group's focus states, held to.
    if (option.key === 'foundations') {
      assert.equal(lesson.questionKind ?? null, null);
    }
    if (option.key === 'question-types') {
      assert.ok(lesson.questionKind, 'a question-types lesson needs its kind');
      const kinds = lesson.stages.flatMap((s) => s.blocks.map((b) => b.kind));
      assert.ok(
        kinds.includes('example'),
        'the see stage needs a worked example',
      );
      assert.ok(kinds.includes('try'), 'the try stage needs a try block');
    }
  });
}

for (const option of RESOURCE_TEMPLATES) {
  test(`resources/${option.key}: the example is a valid resource`, () => {
    const [resource] = items(
      parseItems(resourceSchema, exampleFrom(option.template)),
    );
    assert.ok((resource.body?.length ?? 0) >= 3, 'three paragraphs minimum');

    if (option.key === 'general') return;
    assert.equal(resource.category, option.key);

    // Listening and speaking have no practice engine, so claiming a module
    // would be a promise the app cannot keep. See apps/app/src/lib/modules.ts.
    if (option.key === 'listening' || option.key === 'speaking') {
      assert.equal(resource.module ?? null, null);
    }
  });
}
