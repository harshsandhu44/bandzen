import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  examSkills,
  fullLengthItems,
  isOnScale,
  sectionMinutesLabel,
  targetChoices,
  CURRENT_EXAM_VERSION,
  EXAM_KEYS,
  EXAMS,
  getExam,
  getTask,
  ieltsQuestionTask,
  timeLimitSeconds,
  validateDefinition,
  type ExamDefinition,
  type Skill,
} from './registry.ts';

test('every exam key has exactly one valid definition', () => {
  assert.deepEqual(
    EXAMS.map((e) => e.key),
    [...EXAM_KEYS],
  );
  for (const exam of EXAMS) {
    assert.deepEqual(validateDefinition(exam), [], exam.key);
  }
});

test('versions match what is already stamped on stored rows', () => {
  assert.equal(CURRENT_EXAM_VERSION.ielts, '2026');
  assert.equal(CURRENT_EXAM_VERSION.toefl_ibt, '2026-01-21');
});

test('published task counts', () => {
  assert.equal(getExam('pte_academic')!.tasks.length, 22);
  assert.equal(getExam('det')!.tasks.length, 19);
});

test('lookup by exam and task key', () => {
  assert.equal(getExam('nope'), null);
  assert.equal(getTask('ielts', 'nope'), null);
  assert.equal(getTask('nope', 'read_aloud'), null);
  const readAloud = getTask('pte_academic', 'read_aloud')!;
  assert.equal(readAloud.renderer, 'recording');
  assert.deepEqual(readAloud.measuredSkills, ['speaking']);
});

/**
 * Pearson's Test Taker Score Guide (July 2025), transcribed. Every one of the
 * 22 types, its communicative skills and its item count, so a definition that
 * drifts from the guide fails here rather than quietly moving a candidate's
 * estimate.
 *
 * Read Aloud, Answer Short Question, Respond to a Situation and both Fill in
 * the Blanks types were wrong for exactly this reason: they matched the April
 * 2021 guide, which Pearson has since changed. Nothing tested them.
 */
const PTE_SCORE_GUIDE: Record<
  string,
  { skills: Skill[]; items: [number, number] }
> = {
  // Part 1 Speaking and Writing (approx. 76-84 minutes)
  read_aloud: { skills: ['speaking'], items: [6, 7] },
  repeat_sentence: { skills: ['listening', 'speaking'], items: [10, 12] },
  describe_image: { skills: ['speaking'], items: [5, 6] },
  retell_lecture: { skills: ['listening', 'speaking'], items: [2, 3] },
  answer_short_question: { skills: ['listening'], items: [5, 6] },
  summarize_group_discussion: {
    skills: ['listening', 'speaking'],
    items: [2, 3],
  },
  respond_to_a_situation: { skills: ['speaking'], items: [2, 3] },
  summarize_written_text: { skills: ['reading', 'writing'], items: [2, 2] },
  write_essay: { skills: ['writing'], items: [1, 1] },
  // Part 2 Reading (approx. 23-30 minutes)
  reading_writing_fill_in_the_blanks: { skills: ['reading'], items: [5, 6] },
  reading_multiple_choice_multiple: { skills: ['reading'], items: [2, 3] },
  reorder_paragraphs: { skills: ['reading'], items: [2, 3] },
  reading_fill_in_the_blanks: { skills: ['reading'], items: [4, 5] },
  reading_multiple_choice_single: { skills: ['reading'], items: [2, 3] },
  // Part 3 Listening (approx. 31-39 minutes)
  summarize_spoken_text: { skills: ['listening', 'writing'], items: [1, 1] },
  listening_multiple_choice_multiple: { skills: ['listening'], items: [2, 3] },
  listening_fill_in_the_blanks: { skills: ['listening'], items: [2, 3] },
  highlight_correct_summary: {
    skills: ['listening', 'reading'],
    items: [2, 3],
  },
  listening_multiple_choice_single: { skills: ['listening'], items: [2, 3] },
  select_missing_word: { skills: ['listening'], items: [1, 2] },
  highlight_incorrect_words: {
    skills: ['listening', 'reading'],
    items: [2, 3],
  },
  write_from_dictation: { skills: ['listening', 'writing'], items: [3, 4] },
};

test('every PTE task credits the skills and runs the count the score guide gives it', () => {
  const pte = getExam('pte_academic')!;
  assert.deepEqual(
    pte.tasks.map((t) => t.key).sort(),
    Object.keys(PTE_SCORE_GUIDE).sort(),
  );
  for (const task of pte.tasks) {
    const expected = PTE_SCORE_GUIDE[task.key]!;
    assert.deepEqual([...task.measuredSkills], expected.skills, task.key);
    assert.deepEqual(
      [task.items?.min, task.items?.max],
      expected.items,
      task.key,
    );
  }
});

/**
 * The guide's "Traits scored" column for every model-graded PTE task, as
 * `trait: max`. `words` is Read Aloud's Content, whose maximum "depends on the
 * length of the question prompt". Gates are Content and Form, per p. 8: a zero
 * for either gives the response no score points.
 */
const PTE_TRAITS: Record<string, Record<string, number | 'words'>> = {
  read_aloud: { Content: 'words', Pronunciation: 5, 'Oral fluency': 5 },
  repeat_sentence: { Content: 3, Pronunciation: 5, 'Oral fluency': 5 },
  describe_image: { Content: 6, Pronunciation: 5, 'Oral fluency': 5 },
  retell_lecture: { Content: 6, Pronunciation: 5, 'Oral fluency': 5 },
  answer_short_question: { Vocabulary: 1 },
  summarize_group_discussion: {
    Content: 6,
    Pronunciation: 5,
    'Oral fluency': 5,
  },
  respond_to_a_situation: { Content: 6, Pronunciation: 5, 'Oral fluency': 5 },
  summarize_written_text: { Content: 4, Form: 1, Grammar: 2, Vocabulary: 2 },
  write_essay: {
    Content: 6,
    Form: 2,
    'Development, structure and coherence': 6,
    Grammar: 2,
    'General linguistic range': 6,
    'Vocabulary range': 2,
    Spelling: 2,
  },
  summarize_spoken_text: {
    Content: 4,
    Form: 2,
    Grammar: 2,
    Vocabulary: 2,
    Spelling: 2,
  },
};

test('every model-graded PTE task scores the guide\u2019s traits at the guide\u2019s maxima', () => {
  const pte = getExam('pte_academic')!;
  const graded = pte.tasks.filter((t) => t.evaluator.endsWith('_model'));
  assert.deepEqual(
    graded.map((t) => t.key).sort(),
    Object.keys(PTE_TRAITS).sort(),
  );
  for (const task of graded) {
    const traits = Object.fromEntries(
      task.scoring!.traits.map((t) => [
        t.key,
        t.max === 'reference_words' ? 'words' : t.max,
      ]),
    );
    assert.deepEqual(traits, PTE_TRAITS[task.key], task.key);
    for (const t of task.scoring!.traits) {
      assert.equal(
        Boolean(t.gate),
        t.key === 'Content' || t.key === 'Form',
        `${task.key} ${t.key} gate`,
      );
    }
  }
  // Deterministic tasks keep their evaluator's marks and carry no contract.
  assert.ok(
    pte.tasks
      .filter((t) => !t.evaluator.endsWith('_model'))
      .every((t) => !t.scoring),
  );
});

test('a PTE sitting is 65 to 85 questions, and its parts are the guide\u2019s', () => {
  const pte = getExam('pte_academic')!;
  const total = (pick: (r: { items: [number, number] }) => number) =>
    Object.values(PTE_SCORE_GUIDE).reduce((n, r) => n + pick(r), 0);
  assert.equal(
    fullLengthItems(pte),
    total((r) => r.items[0]),
  );
  assert.equal(fullLengthItems(pte), 65);
  assert.equal(
    total((r) => r.items[1]),
    85,
  );

  assert.deepEqual(
    pte.sections.map((s) => sectionMinutesLabel(s)),
    ['76\u201384 min', '23\u201330 min', '31\u201339 min'],
  );
  // Pearson states the total; the parts deliberately do not sum to it.
  assert.equal(pte.duration, 'About 2 hr 15 min');
});

test('a fixed section reads as one number, and every exam states its length', () => {
  assert.equal(sectionMinutesLabel(getExam('ielts')!.sections[1]!), '60 min');
  assert.equal(sectionMinutesLabel(getExam('det')!.sections[0]!), null);
  for (const exam of EXAMS) {
    assert.ok(exam.duration.length > 0, exam.key);
  }
  // No item counts outside PTE, so nothing claims a length it cannot fill.
  assert.equal(fullLengthItems(getExam('ielts')!), 0);
});

test('every stored IELTS question kind resolves to the renderer the runner used before', () => {
  const expected = {
    reading: {
      true_false_not_given: 'choice_cards',
      yes_no_not_given: 'choice_cards',
      multiple_choice: 'choice_cards',
      matching_headings: 'choice_select',
      sentence_completion: 'text_input',
    },
    listening: {
      multiple_choice: 'choice_cards',
      sentence_completion: 'text_input',
      matching: 'choice_select',
    },
  } as const;
  for (const [section, kinds] of Object.entries(expected)) {
    for (const [kind, renderer] of Object.entries(kinds)) {
      assert.equal(
        ieltsQuestionTask(section as 'reading' | 'listening', kind).renderer,
        renderer,
        `${section} ${kind}`,
      );
    }
  }
  assert.throws(() => ieltsQuestionTask('reading', 'matching'));
});

test('time limits come from the task window, else the section clock', () => {
  const ielts = getExam('ielts')!;
  assert.equal(
    timeLimitSeconds(ielts, getTask('ielts', 'reading_multiple_choice')!),
    3600,
  );
  assert.equal(
    timeLimitSeconds(ielts, getTask('ielts', 'speaking_part_2')!),
    180,
  );
  const toefl = getExam('toefl_ibt')!;
  assert.equal(
    timeLimitSeconds(toefl, getTask('toefl_ibt', 'read_in_daily_life')!),
    null,
  );
});

test('target choices come from each exam, on its own scale', () => {
  assert.deepEqual(
    targetChoices(getExam('ielts')!),
    [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9],
  );
  assert.equal(targetChoices(getExam('pte_academic')!).length, 13);
  assert.deepEqual(targetChoices(getExam('toefl_ibt')!).slice(0, 2), [3, 3.5]);
  assert.equal(targetChoices(getExam('det')!).at(-1), 160);
  assert.equal(isOnScale(getExam('ielts')!, 7.5), true);
  assert.equal(isOnScale(getExam('ielts')!, 7.3), false);
  assert.equal(isOnScale(getExam('pte_academic')!, 95), false);
  assert.equal(isOnScale(getExam('det')!, 115), true);
  assert.equal(isOnScale(getExam('det')!, 112), false);
});

test('an exam lists the skills its sections measure, once each', () => {
  assert.deepEqual(examSkills(getExam('ielts')!), [
    'listening',
    'reading',
    'writing',
    'speaking',
  ]);
  assert.deepEqual(examSkills(getExam('pte_academic')!), [
    'speaking',
    'writing',
    'reading',
    'listening',
  ]);
});

test('invalid definitions are reported, not accepted', () => {
  const base = getExam('ielts')!;
  const broken: ExamDefinition = {
    ...base,
    scoreScale: { label: 'Band', min: 9, max: 0, step: 0.5 },
    targetRange: { min: 5, max: 9.25, step: 0.5 },
    tasks: [
      ...base.tasks,
      { ...base.tasks[0]!, section: 'maths' },
      {
        ...base.tasks[1]!,
        key: 'odd',
        renderer: 'hologram' as never,
        evaluator: 'vibes' as never,
        measuredSkills: [],
        timing: { scope: 'task', prepSeconds: -1, responseSeconds: 0 },
      },
    ],
  };
  const problems = validateDefinition(broken);
  const has = (fragment: string) =>
    assert.ok(
      problems.some((p) => p.includes(fragment)),
      `expected a problem mentioning "${fragment}" in ${JSON.stringify(problems)}`,
    );
  has('is not a scale');
  has('does not fit the scale');
  has('declared twice');
  has('unknown section "maths"');
  has('unknown renderer "hologram"');
  has('unknown evaluator "vibes"');
  has('measures no known skill');
  has('impossible time window');
});

test('every PTE audio task plays once and starts itself', () => {
  const pte = getExam('pte_academic')!;
  for (const task of pte.tasks) {
    const shows = task.stimulus === 'audio' || task.stimulus === 'mixed';
    const where = `pte_academic/${task.key}`;
    if (!shows) {
      assert.equal(task.audio, undefined, `${where} has audio it never shows`);
      continue;
    }
    assert.deepEqual(
      task.audio,
      { plays: 1, autoplay: true },
      `${where} must be single-play`,
    );
  }
});

test('an impossible audio policy is reported', () => {
  const base = getExam('pte_academic')!;
  const broken: ExamDefinition = {
    ...base,
    tasks: [
      { ...base.tasks[0]!, key: 'silent', audio: { plays: 0, autoplay: true } },
      {
        ...base.tasks[0]!,
        key: 'unheard',
        stimulus: 'text',
        audio: { plays: 1, autoplay: true, startDelaySeconds: -3 },
      },
    ],
  };
  const problems = validateDefinition(broken);
  const has = (fragment: string) =>
    assert.ok(
      problems.some((p) => p.includes(fragment)),
      `expected "${fragment}" in ${JSON.stringify(problems)}`,
    );
  has('allows no plays');
  has('has an audio policy but shows no audio');
  has('starts its audio before it begins');
});
