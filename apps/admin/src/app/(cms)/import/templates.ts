import type { z } from 'zod';
import type {
  lessonSchema,
  listeningTrackSchema,
  passageSchema,
  resourceSchema,
  speakingTestSchema,
  writingPromptSchema,
} from './schemas';

/**
 * The templates a human copies, pastes into a model, and pastes back.
 *
 * Each entity has one BASE — the schema rules, written once — and a set of
 * variants that each add a focus paragraph and one worked example. What lands
 * on the clipboard is BASE + focus + example, so it is complete on its own
 * while the rules exist in exactly one place.
 *
 * The examples are objects, not text inside a string, which is what lets
 * `templates.test.ts` parse every one of them against its own schema. An
 * invalid example is the worst bug this file can carry: a model copies the
 * example far more faithfully than it follows the rules.
 *
 * "General" is first everywhere and is what the single template used to be —
 * nothing about importing an existing `apps/app/content/passages/*.json`
 * changes unless you reach for the picker.
 */

export type TemplateOption = { key: string; label: string; template: string };

type Variant<T> = {
  label: string;
  /** What makes this variant different. Follows the shared rules. */
  focus: string;
  example: T;
};

function build<T>(
  base: string,
  variants: Record<string, Variant<T>>,
): TemplateOption[] {
  return Object.entries(variants).map(([key, v]) => ({
    key,
    label: v.label,
    template: `${base}\n\n${v.focus}\n\n${JSON.stringify([v.example], null, 2)}`,
  }));
}

// ---------------------------------------------------------------------------
// Passages
// ---------------------------------------------------------------------------

type Passage = z.infer<typeof passageSchema>;
type Question = Passage['questions'][number];

/**
 * These clipboard rules track the canonical authoring rules in
 * @bandzen/ai/prompts (PASSAGE_SYSTEM) — reworded for a paste-into-a-chatbot
 * flow rather than a strict Structured Outputs call. Keep them in step.
 */
const PASSAGE_BASE = `Write IELTS Academic Reading practice material as a JSON array matching the
example below exactly. Return JSON only.

- The passage must be original prose on a factual, academic topic, 700-900
  words. Never reproduce copyrighted exam material.
- Label paragraphs A, B, C… on their own line in body, exactly as the example
  does.
- Thirteen questions, idx 1..13 with no gaps.
- Every question's evidence must be a sentence that appears verbatim in body.
  For a NOT GIVEN answer, quote the nearest sentence on the topic and let the
  explanation say what it does not establish.
- Distractors must be plausible enough that the question cannot be answered
  without reading the passage. An option naming a topic the passage never
  mentions is a wasted option: build distractors from real content belonging to
  a DIFFERENT paragraph, or from a plausible misreading of the right one.
- headings is a single passage-level list. Where the paper has
  matching_headings questions it is their shared option list; otherwise supply
  one credible heading per paragraph.
- difficulty is 1-5. "format" is optional and defaults to "academic".

The example below shows three of the thirteen questions.`;

const CLOCK_PASSAGE = {
  slug: 'the-invention-of-clock-time',
  title: 'The Invention of Clock Time',
  topic: 'history of technology',
  difficulty: 2,
  headings: [
    'Why local solar time went unquestioned',
    'The timetable problem the railways created',
    'Competing company clocks in North America',
    'Reaching international agreement on a prime meridian',
    'Legal recognition lagging behind common practice',
    'How shipping charts settled a political question',
    'The dangers of running trains on mismatched clocks',
  ],
  body: `A
For most of recorded history, time was a local matter. A town set its clocks by the sun, and noon arrived when the sun stood highest over that particular place. Two towns twenty miles apart kept genuinely different times. The discrepancy troubled almost nobody.

B
The railways changed that. A timetable is useless if every station keeps its own clock, and two trains sharing a single track and relying on scheduled passing points could be separated by a margin no wider than the disagreement between their stations. British railway companies adopted a single standard, taken from Greenwich, within a decade of the first long-distance lines opening.

C
North America solved the same problem more slowly. Individual railroad companies each kept their own time, and a large station might display half a dozen clocks, one per company. A traveller changing trains had to change time as well.

D
Delegates met in Washington in 1884 to settle on a single prime meridian. Greenwich won largely because most of the world's shipping already used charts based on it. International agreement followed the next year.

E
Legal recognition lagged well behind. Britain did not make Greenwich time its legal standard until 1880, decades after the railways had made it the practical one, and several countries waited longer still.`,
};

/** The three questions each passage variant shows, keyed by dominant kind. */
const PASSAGE_QUESTIONS: Record<string, Question[]> = {
  general: [
    {
      idx: 1,
      kind: 'true_false_not_given',
      prompt:
        'Before the railways, differences in time between nearby towns caused serious practical problems.',
      options: null,
      answer: ['FALSE'],
      evidence: 'The discrepancy troubled almost nobody.',
      explanation:
        'The passage says the discrepancy troubled almost nobody, which contradicts the claim.',
    },
    {
      idx: 2,
      kind: 'matching_headings',
      prompt: 'Choose the most suitable heading for paragraph C.',
      options: null,
      answer: ['Competing company clocks in North America'],
      evidence:
        'Individual railroad companies each kept their own time, and a large station might display half a dozen clocks, one per company.',
      explanation:
        'The paragraph is about rival companies each keeping a clock of their own.',
    },
    {
      idx: 3,
      kind: 'multiple_choice',
      prompt: 'Greenwich was chosen as the prime meridian mainly because',
      options: [
        'Britain had the largest railway network at the time.',
        'most of the world’s shipping already used charts based on it.',
        'the 1884 delegates could not agree on any alternative.',
        'it had been Britain’s legal standard since 1880.',
      ],
      answer: ['most of the world’s shipping already used charts based on it.'],
      evidence:
        "Greenwich won largely because most of the world's shipping already used charts based on it.",
      explanation:
        'The passage names shipping charts as the reason. The other options draw on real content from paragraphs B and E, none of which is given as the cause.',
    },
  ],
  true_false_not_given: [
    {
      idx: 1,
      kind: 'true_false_not_given',
      prompt:
        'Before the railways, differences in time between nearby towns caused serious practical problems.',
      options: null,
      answer: ['FALSE'],
      evidence: 'The discrepancy troubled almost nobody.',
      explanation:
        'The passage says the discrepancy troubled almost nobody, which contradicts the claim.',
    },
    {
      idx: 2,
      kind: 'true_false_not_given',
      prompt:
        'More people were killed in railway accidents than in any other form of transport at the time.',
      options: null,
      answer: ['NOT GIVEN'],
      evidence:
        'A timetable is useless if every station keeps its own clock, and two trains sharing a single track and relying on scheduled passing points could be separated by a margin no wider than the disagreement between their stations.',
      explanation:
        'The passage raises the safety risk but never compares causes of death, or gives any figures.',
    },
    {
      idx: 3,
      kind: 'multiple_choice',
      prompt: 'Britain made Greenwich time its legal standard',
      options: [
        'before the railways adopted it.',
        'in the same year the railways adopted it.',
        'decades after the railways had adopted it.',
        'only after the 1884 Washington conference.',
      ],
      answer: ['decades after the railways had adopted it.'],
      evidence:
        'Britain did not make Greenwich time its legal standard until 1880, decades after the railways had made it the practical one, and several countries waited longer still.',
      explanation:
        'The passage states the legal date came decades after the practical one. The 1884 option is a plausible misreading built from paragraph D.',
    },
  ],
  yes_no_not_given: [
    {
      idx: 1,
      kind: 'yes_no_not_given',
      prompt:
        'The writer believes the railways had no realistic alternative to imposing a single standard time.',
      options: null,
      answer: ['YES'],
      evidence:
        'A timetable is useless if every station keeps its own clock, and two trains sharing a single track and relying on scheduled passing points could be separated by a margin no wider than the disagreement between their stations.',
      explanation:
        'Calling a timetable "useless" without a shared clock, and naming the collision risk, is the writer taking a position rather than reporting a fact.',
    },
    {
      idx: 2,
      kind: 'yes_no_not_given',
      prompt:
        'The writer regards the North American delay as the fault of the railroad companies.',
      options: null,
      answer: ['NOT GIVEN'],
      evidence: 'North America solved the same problem more slowly.',
      explanation:
        'The passage records that it was slower and describes the rival clocks, but never assigns blame for the delay.',
    },
    {
      idx: 3,
      kind: 'true_false_not_given',
      prompt: 'The Washington conference took place in 1884.',
      options: null,
      answer: ['TRUE'],
      evidence:
        'Delegates met in Washington in 1884 to settle on a single prime meridian.',
      explanation: 'The date is stated directly.',
    },
  ],
  multiple_choice: [
    {
      idx: 1,
      kind: 'multiple_choice',
      prompt: 'Greenwich was chosen as the prime meridian mainly because',
      options: [
        'Britain had the largest railway network at the time.',
        'most of the world’s shipping already used charts based on it.',
        'the 1884 delegates could not agree on any alternative.',
        'it had been Britain’s legal standard since 1880.',
      ],
      answer: ['most of the world’s shipping already used charts based on it.'],
      evidence:
        "Greenwich won largely because most of the world's shipping already used charts based on it.",
      explanation:
        'The passage names shipping charts as the reason. The other three are built from real content in paragraphs B and E, none of which is offered as the cause.',
    },
    {
      idx: 2,
      kind: 'multiple_choice',
      prompt:
        'What does the writer suggest about a traveller changing trains in North America?',
      options: [
        'They risked missing connections that were scheduled in another company’s time.',
        'They were required to reset their own watch at every station.',
        'They paid a different fare depending on the company.',
        'They could consult a single clock showing all company times.',
      ],
      answer: [
        'They risked missing connections that were scheduled in another company’s time.',
      ],
      evidence: 'A traveller changing trains had to change time as well.',
      explanation:
        'Changing time when changing trains is what makes a connection risky. The fourth option inverts the half-dozen clocks detail from the same paragraph.',
    },
    {
      idx: 3,
      kind: 'sentence_completion',
      prompt:
        'A large North American station might display half a dozen clocks, one per ________. (ONE WORD ONLY)',
      options: null,
      answer: ['company'],
      evidence:
        'Individual railroad companies each kept their own time, and a large station might display half a dozen clocks, one per company.',
      explanation: 'The word is lifted verbatim from the sentence.',
    },
  ],
  matching_headings: [
    {
      idx: 1,
      kind: 'matching_headings',
      prompt: 'Choose the most suitable heading for paragraph B.',
      options: null,
      answer: ['The timetable problem the railways created'],
      evidence:
        'A timetable is useless if every station keeps its own clock, and two trains sharing a single track and relying on scheduled passing points could be separated by a margin no wider than the disagreement between their stations.',
      explanation:
        'The paragraph is about the railways making a shared clock necessary. "The dangers of running trains on mismatched clocks" is the trap: the danger is mentioned, but it is the consequence, not the paragraph’s subject.',
    },
    {
      idx: 2,
      kind: 'matching_headings',
      prompt: 'Choose the most suitable heading for paragraph D.',
      options: null,
      answer: ['Reaching international agreement on a prime meridian'],
      evidence:
        'Delegates met in Washington in 1884 to settle on a single prime meridian.',
      explanation:
        'The paragraph covers the conference and its outcome. "How shipping charts settled a political question" draws on one sentence within it and is too narrow to head the whole paragraph.',
    },
    {
      idx: 3,
      kind: 'true_false_not_given',
      prompt:
        'Britain adopted a single railway standard within ten years of its first long-distance lines.',
      options: null,
      answer: ['TRUE'],
      evidence:
        'British railway companies adopted a single standard, taken from Greenwich, within a decade of the first long-distance lines opening.',
      explanation:
        '"Within a decade" states the same span as "within ten years".',
    },
  ],
  sentence_completion: [
    {
      idx: 1,
      kind: 'sentence_completion',
      prompt:
        'A town set its clocks by the sun, and noon arrived when the sun stood ________ over that place. (ONE WORD ONLY)',
      options: null,
      answer: ['highest'],
      evidence:
        'A town set its clocks by the sun, and noon arrived when the sun stood highest over that particular place.',
      explanation:
        'The word is lifted verbatim, and the word limit rules out "highest over".',
    },
    {
      idx: 2,
      kind: 'sentence_completion',
      prompt:
        'Britain did not make Greenwich time its ________ until 1880. (NO MORE THAN TWO WORDS)',
      options: null,
      answer: ['legal standard'],
      evidence:
        'Britain did not make Greenwich time its legal standard until 1880, decades after the railways had made it the practical one, and several countries waited longer still.',
      explanation:
        'Two words, taken verbatim. "Practical one" appears in the same sentence and is the trap for a reader skimming for the nearest noun.',
    },
    {
      idx: 3,
      kind: 'true_false_not_given',
      prompt: 'Some countries adopted Greenwich time later than Britain did.',
      options: null,
      answer: ['TRUE'],
      evidence:
        'Britain did not make Greenwich time its legal standard until 1880, decades after the railways had made it the practical one, and several countries waited longer still.',
      explanation:
        '"Several countries waited longer still" states it directly.',
    },
  ],
};

/** How many of the thirteen questions a chosen kind should account for. */
const DOMINANT =
  'Questions 1-7 must be this kind; the remaining six must come\nfrom at least two other kinds.';

const KIND_RULES: Record<string, string> = {
  true_false_not_given: `${DOMINANT}

true_false_not_given rules:
  - options must be null.
  - answer is exactly one of "TRUE", "FALSE" or "NOT GIVEN".
  - The statements test facts the passage asserts, not the writer's opinions.
  - At least two must be NOT GIVEN, and they must be genuinely absent rather
    than merely contradicted — a contradicted statement is FALSE.
  - A FALSE statement must conflict with the passage, not simply go beyond it.`,

  yes_no_not_given: `${DOMINANT}

yes_no_not_given rules:
  - options must be null.
  - answer is exactly one of "YES", "NO" or "NOT GIVEN".
  - These test the writer's views and claims, never plain facts — if a
    statement can be checked against a date or a figure it belongs in
    true_false_not_given instead. The passage must therefore contain evaluative
    language for these to hang on.
  - At least two must be NOT GIVEN.`,

  multiple_choice: `${DOMINANT}

multiple_choice rules:
  - Exactly four options, and answer must match one of them character for
    character.
  - Every wrong option must be built from real content in the passage: a fact
    from a different paragraph, a true statement that does not answer the
    question asked, or a plausible misreading of the right sentence.
  - Do not make the correct option the longest or the most qualified one.`,

  matching_headings: `${DOMINANT}

matching_headings rules:
  - options must be null. Every such question draws from the single
    passage-level "headings" list, exactly as a real paper presents one list of
    headings for all the paragraphs it covers.
  - Supply at least three more headings than there are matching_headings
    questions, and no heading may be the answer to more than one.
  - Every unused heading must still credibly summarise something in the
    passage — a detail from the wrong paragraph, or a sub-point too narrow to
    head the paragraph it belongs to.
  - Name the paragraph by its letter in the prompt.`,

  sentence_completion: `${DOMINANT}

sentence_completion rules:
  - options must be null.
  - The answer must be lifted verbatim from the passage — same word, same
    form, no paraphrase and no inflection change.
  - State the word limit in the prompt in capitals, as the example does, and
    keep the answer within it.
  - Put the gap where a skim-reader would reach for a nearby noun that does not
    fit the limit or the grammar.`,
};

const KIND_LABEL: Record<string, string> = {
  true_false_not_given: 'True / False / Not Given',
  yes_no_not_given: 'Yes / No / Not Given',
  multiple_choice: 'Multiple choice',
  matching_headings: 'Matching headings',
  sentence_completion: 'Sentence completion',
};

export const PASSAGE_TEMPLATES = build<Passage>(PASSAGE_BASE, {
  general: {
    label: 'General',
    focus:
      'Mix at least three of the five kinds across the thirteen questions:\ntrue_false_not_given, yes_no_not_given, multiple_choice, matching_headings,\nsentence_completion. Include at least one genuinely NOT GIVEN answer.',
    example: { ...CLOCK_PASSAGE, questions: PASSAGE_QUESTIONS.general },
  },
  ...Object.fromEntries(
    Object.keys(KIND_RULES).map((kind) => [
      kind,
      {
        label: KIND_LABEL[kind],
        focus: KIND_RULES[kind],
        example: { ...CLOCK_PASSAGE, questions: PASSAGE_QUESTIONS[kind] },
      },
    ]),
  ),
});

// ---------------------------------------------------------------------------
// Listening tracks
// ---------------------------------------------------------------------------

type ListeningTrack = z.infer<typeof listeningTrackSchema>;

/**
 * The example below is a complete track — transcript, audio and questions —
 * because that is what the offline pipeline emits and what a model prompted
 * with this should aim for. Import itself is looser: a row needs a
 * `transcript` OR an `audioUrl` (the CMS generates the other when the draft
 * is opened), and `questions` may be omitted on an audio-only row since they
 * can't be written before the transcript exists.
 */
const LISTENING_BASE = `Write an IELTS Listening track as a JSON array matching the example below
exactly. Return JSON only.

- transcript is an original spoken script — a monologue, or a conversation
  with each speaker labelled "Name:" on its own line. Never reproduce
  copyrighted exam material.
- Ten questions, idx 1..10 with no gaps, mixing at least two of:
  multiple_choice, sentence_completion, matching.
- Every question's evidence must be a line that appears verbatim in the
  transcript.
- multiple_choice supplies four options and the answer matches one exactly.
- matching has options: null and draws its answer from the single track-level
  matchingOptions list. Supply at least three more matchingOptions than there
  are matching questions; no option answers two questions.
- sentence_completion answers are words lifted verbatim from the transcript,
  within the word limit stated in the prompt.
- difficulty is 1-5.
- Provide a transcript, an audioUrl, or both. audioUrl, when given, must be a
  real URL to an existing MP3. Omit questions if you only have the audio.`;

export const LISTENING_TEMPLATES = build<ListeningTrack>(LISTENING_BASE, {
  general: {
    label: 'General',
    focus:
      'Mix at least two kinds across the questions. The example below is\nshortened to three questions; a real track has ten.',
    example: {
      slug: 'riverside-library-tour',
      title: 'A Tour of the Riverside Library',
      topic: 'A new visitor is shown around a community library',
      difficulty: 2,
      audioUrl:
        'https://pub-example.r2.dev/listening/riverside-library-tour.mp3',
      transcript:
        "Guide: Welcome to the Riverside Community Library. Our opening hours are nine to six on weekdays, and ten to four on Saturdays.\nVisitor: Is there a fee to join?\nGuide: Membership is free for residents. You'll need to show proof of address, such as a utility bill.\nVisitor: How many books can I borrow at once?\nGuide: Up to eight items, for three weeks each. You can renew online twice.\nVisitor: And where are the study rooms?\nGuide: On the second floor. They must be booked in advance at the front desk.",
      matchingOptions: null,
      questions: [
        {
          idx: 1,
          kind: 'multiple_choice',
          prompt: 'How many items can a member borrow at once?',
          options: ['up to eight', 'up to three', 'up to six', 'up to twelve'],
          answer: ['up to eight'],
          evidence: 'Up to eight items, for three weeks each.',
          explanation: 'The guide states the borrowing limit is eight items.',
        },
        {
          idx: 2,
          kind: 'sentence_completion',
          prompt:
            'Complete the sentence. Write ONE WORD. To join, residents must show proof of ________.',
          options: null,
          answer: ['address'],
          evidence:
            "You'll need to show proof of address, such as a utility bill.",
          explanation:
            'Proof of address is the requirement the guide names for joining.',
        },
        {
          idx: 3,
          kind: 'sentence_completion',
          prompt:
            'Complete the sentence. Write ONE WORD. The study rooms are on the ________ floor.',
          options: null,
          answer: ['second'],
          evidence: 'On the second floor.',
          explanation: 'The guide places the study rooms on the second floor.',
        },
      ],
    },
  },
  matching: {
    label: 'Matching',
    focus: `Lead with matching questions, each asking which instruction or
feature goes with a place or person named in the transcript, all drawing from
one shared matchingOptions list. Keep at least three spare options that are
still plausible. The example is shortened; a real track has ten questions.`,
    example: {
      slug: 'volunteer-shift-briefing',
      title: 'A Volunteer Shift Briefing',
      topic:
        'A coordinator explains the rules for each area to a new volunteer',
      difficulty: 3,
      audioUrl:
        'https://pub-example.r2.dev/listening/volunteer-shift-briefing.mp3',
      transcript:
        'Coordinator: Before you start your volunteer shift, here are the rules for each area.\nFor the reception desk, always log every visitor in the paper book.\nFor the cafe, wipe down the tables after each customer leaves.\nFor the garden, put all tools back in the locked shed before you go home.\nVolunteer: Got it. Anything about the shop?\nCoordinator: For the shop, count the till twice at closing time.',
      matchingOptions: [
        'Log every visitor',
        'Wipe down the tables',
        'Return tools to the shed',
        'Count the till twice',
        'Wear a name badge',
        'Water the plants',
        'Lock the front gate',
      ],
      questions: [
        {
          idx: 1,
          kind: 'matching',
          prompt: 'Which instruction is given for the reception desk?',
          options: null,
          answer: ['Log every visitor'],
          evidence:
            'For the reception desk, always log every visitor in the paper book.',
          explanation: 'The reception-desk rule is to log every visitor.',
        },
        {
          idx: 2,
          kind: 'matching',
          prompt: 'Which instruction is given for the cafe?',
          options: null,
          answer: ['Wipe down the tables'],
          evidence:
            'For the cafe, wipe down the tables after each customer leaves.',
          explanation:
            'The cafe rule is to wipe the tables after each customer.',
        },
        {
          idx: 3,
          kind: 'matching',
          prompt: 'Which instruction is given for the garden?',
          options: null,
          answer: ['Return tools to the shed'],
          evidence:
            'For the garden, put all tools back in the locked shed before you go home.',
          explanation:
            'The garden rule is to return the tools to the locked shed.',
        },
        {
          idx: 4,
          kind: 'multiple_choice',
          prompt: 'What must the volunteer do at the shop?',
          options: [
            'count the till twice',
            'restock the shelves',
            'mop the floor',
            'email the manager',
          ],
          answer: ['count the till twice'],
          evidence: 'For the shop, count the till twice at closing time.',
          explanation: 'The shop rule is to count the till twice at closing.',
        },
      ],
    },
  },
});

// ---------------------------------------------------------------------------
// Speaking tests
// ---------------------------------------------------------------------------

type SpeakingTest = z.infer<typeof speakingTestSchema>;

const SPEAKING_BASE = `Write an IELTS Speaking test as a JSON array matching the example below
exactly. Return JSON only.

- The three parts are flattened into one ordered "prompts" array. idx starts
  at 1 with no gaps. part is 1, 2 or 3.
- Part 1: 3-4 short personal questions on ONE familiar topic, answerable in a
  sentence or two.
- Part 2: exactly one prompt, part 2, whose text is the "Describe ..." cue
  card line. cueCardPoints is the 3-4 "You should say:" bullets. prepSeconds
  is 60.
- Part 3: 4-6 abstract discussion questions that open the Part 2 topic out —
  opinion, comparison, cause, prediction. No yes/no questions. prepSeconds 0.
- Every prompt is what an examiner says aloud — no stage directions.
- cueCardPoints is null on Part 1 and Part 3 prompts. Omit audioUrl; the CMS
  synthesizes the examiner voice when you open the draft.
- Never reproduce copyrighted exam questions.`;

const SPEAKING_EXAMPLE: SpeakingTest = {
  slug: 'a-place-you-return-to',
  title: 'Speaking — a place you return to',
  topic: 'Somewhere the candidate goes back to often',
  difficulty: 3,
  prompts: [
    {
      idx: 1,
      part: 1,
      text: 'Where is your home town, and what is it known for?',
      cueCardPoints: null,
      prepSeconds: 0,
    },
    {
      idx: 2,
      part: 1,
      text: 'Do you still live there now? Why or why not?',
      cueCardPoints: null,
      prepSeconds: 0,
    },
    {
      idx: 3,
      part: 1,
      text: 'Is it a good place for young people to grow up?',
      cueCardPoints: null,
      prepSeconds: 0,
    },
    {
      idx: 4,
      part: 2,
      text: 'Describe a place you often go back to. You should say:',
      cueCardPoints: [
        'where it is and how you first came to know it',
        'how often you go there and who with',
        'what you usually do while you are there',
        'and explain why you keep going back.',
      ],
      prepSeconds: 60,
    },
    {
      idx: 5,
      part: 3,
      text: 'Why do people form strong attachments to particular places?',
      cueCardPoints: null,
      prepSeconds: 0,
    },
    {
      idx: 6,
      part: 3,
      text: 'Do you think a place can lose the meaning it once had for someone?',
      cueCardPoints: null,
      prepSeconds: 0,
    },
    {
      idx: 7,
      part: 3,
      text: 'How has the way people choose where to live changed in recent decades?',
      cueCardPoints: null,
      prepSeconds: 0,
    },
    {
      idx: 8,
      part: 3,
      text: 'Is it better to spend your life in one place or to move around?',
      cueCardPoints: null,
      prepSeconds: 0,
    },
  ],
};

export const SPEAKING_TEMPLATES = build<SpeakingTest>(SPEAKING_BASE, {
  general: {
    label: 'General',
    focus:
      'A full test — 3-4 Part 1 questions, one Part 2 cue card, 4-6 Part 3\nquestions. The example below is complete.',
    example: SPEAKING_EXAMPLE,
  },
  'part-2-topic': {
    label: 'Part 2 topic',
    focus: `Build the whole test outward from a single Part 2 topic: pick the
cue card first, then Part 1 questions on the everyday side of that topic and
Part 3 questions on its abstract side. The example does this with "a place you
return to".`,
    example: SPEAKING_EXAMPLE,
  },
});

// ---------------------------------------------------------------------------
// Writing prompts
// ---------------------------------------------------------------------------

type WritingPrompt = z.infer<typeof writingPromptSchema>;

const WRITING_PROMPT_BASE = `Write IELTS writing prompts as a JSON array matching the example below
exactly. Return JSON only.

- task is 1 or 2. "format" is "academic" or "general" and defaults to
  "academic" when omitted.
- promptText uses "\\n\\n" between paragraphs, and ends with the standard
  instruction line and the word minimum, exactly as the example does.
- The slug names the task and the topic, lower case and hyphenated.
- chartData is stored but nothing renders it yet, so the shape below is a
  suggestion rather than a contract. Omit it entirely when there is no figure.`;

export const WRITING_PROMPT_TEMPLATES = build<WritingPrompt>(
  WRITING_PROMPT_BASE,
  {
    general: {
      label: 'General',
      focus:
        'Any task. The example is a Task 2 discussion essay, the most common\nshape.',
      example: {
        slug: 'task2-remote-work',
        task: 2,
        promptText:
          'Some people believe that allowing employees to work from home permanently benefits both companies and workers. Others argue that it weakens teams and harms younger employees in particular.\n\nDiscuss both these views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
      },
    },
    task2: {
      label: 'Task 2 — essay',
      focus: `Task 2, 40 minutes, at least 250 words. Set task to 2.

- Open with the situation or the competing positions in one or two sentences,
  then the instruction on its own line: "Discuss both these views and give your
  own opinion", "To what extent do you agree or disagree?", "Do the advantages
  outweigh the disadvantages?", or "What are the causes, and what measures
  could be taken?"
- The topic must be arguable by an educated adult anywhere in the world with no
  specialist knowledge and no country-specific facts.
- Do not stack two questions into one prompt. One instruction, one essay.`,
      example: {
        slug: 'task2-museums-free-entry',
        task: 2,
        format: 'academic',
        promptText:
          'In some countries, entry to national museums and galleries is free of charge. In others, visitors are expected to pay.\n\nDo the advantages of free entry outweigh the disadvantages?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience. Write at least 250 words.',
      },
    },
    'task1-academic': {
      label: 'Task 1 Academic — chart or process',
      focus: `Task 1 Academic, 20 minutes, at least 150 words. Set task to 1 and
format to "academic".

- The candidate summarises a visual: a line graph, bar chart, table, pie chart,
  map, or a diagram of a process. They report and compare; they never give an
  opinion, and the prompt must not invite one.
- promptText must describe the visual precisely enough to write from — what is
  measured, in what units, over what period, for which groups — because the
  chart itself is not rendered yet.
- Close with the standard line: "Summarise the information by selecting and
  reporting the main features, and make comparisons where relevant."
- Supply chartData when there are figures behind the description, and keep them
  consistent with the wording.`,
      example: {
        slug: 'task1-academic-household-internet',
        task: 1,
        format: 'academic',
        promptText:
          'The line graph below shows the percentage of households with internet access in three countries between 2000 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.',
        chartData: {
          kind: 'line',
          title: 'Households with internet access, 2000-2020',
          unit: '% of households',
          xLabel: 'Year',
          series: [
            {
              name: 'Japan',
              points: [
                [2000, 34],
                [2005, 57],
                [2010, 78],
                [2015, 88],
                [2020, 93],
              ],
            },
            {
              name: 'Brazil',
              points: [
                [2000, 5],
                [2005, 13],
                [2010, 27],
                [2015, 51],
                [2020, 71],
              ],
            },
            {
              name: 'Kenya',
              points: [
                [2000, 1],
                [2005, 4],
                [2010, 11],
                [2015, 26],
                [2020, 44],
              ],
            },
          ],
        },
      },
    },
    'task1-general': {
      label: 'Task 1 General — letter',
      focus: `Task 1 General Training, 20 minutes, at least 150 words. Set task
to 1 and format to "general".

- The candidate writes a letter, not a report. Give the situation, name the
  recipient, and set the register: formal to a stranger or an institution,
  semi-formal to a named individual they know slightly, informal to a friend.
- Follow with three bullet points, each on its own line beginning "- ", naming
  what the letter must cover. Three, always.
- Close with the standard lines: "Write at least 150 words." and, above it,
  "You do NOT need to write any addresses." Add the opening line the candidate
  must use ("Begin your letter as follows: Dear …,").
- The situation must be an everyday one — housing, work, travel, a purchase, a
  neighbour, a course — and never require specialist knowledge.`,
      example: {
        slug: 'task1-general-noisy-neighbour',
        task: 1,
        format: 'general',
        promptText:
          'You have recently moved into a new flat. The building work being carried out in the flat above yours is making it difficult for you to work from home.\n\nWrite a letter to the building manager. In your letter\n\n- explain who you are and where you live\n- describe the problem the building work is causing you\n- say what you would like the manager to do about it\n\nYou do NOT need to write any addresses.\n\nBegin your letter as follows: Dear Sir or Madam,\n\nWrite at least 150 words.',
      },
    },
  },
);

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

type Lesson = z.infer<typeof lessonSchema>;

const LESSON_BASE = `Write IELTS lessons as a JSON array matching the example below exactly.
Return JSON only.

- module is "reading" or "writing". group is "foundations", "question-types" or
  "advanced".
- questionKind is the question type the lesson teaches, or null: one of
  true_false_not_given, yes_no_not_given, multiple_choice, matching_headings,
  sentence_completion.
- orderIndex is optional and sets the position within its module and group.
- minutes is how long the lesson takes to work through, honestly estimated.
- stages[].id is one of: understand, see, try, practice, check, improve — in
  that order, and you may omit any stage that has nothing to say.
- A block is one of six kinds, each with its own fields:
    { "kind": "prose", "body": "…" }
    { "kind": "steps", "items": ["…"] }
    { "kind": "checklist", "items": ["…"] }
    { "kind": "callout", "tone": "note" | "warning", "title": "…", "body": "…" }
    { "kind": "example", "source": "…", "question": "…", "answer": "…", "why": "…" }
    { "kind": "try", "source": "…" (optional), "question": "…", "answer": "…", "why": "…" }
  "example" shows the reasoning worked through; "try" is a question the reader
  answers in their head before revealing. Both need a "why" that explains the
  reasoning, not just the answer.
- Write to a candidate who is nervous and short of time. No filler, no
  encouragement that carries no information.`;

export const LESSON_TEMPLATES = build<Lesson>(LESSON_BASE, {
  general: {
    label: 'General',
    focus:
      'Any group. The example is a foundations lesson, the simplest shape:\nno question kind, and stages that move from the idea to a worked example to\none the reader tries.',
    example: {
      slug: 'skimming-for-gist',
      module: 'reading',
      group: 'foundations',
      title: 'Skimming for gist',
      summary:
        'Read a passage fast enough to know where each idea lives, without reading every word.',
      minutes: 8,
      questionKind: null,
      orderIndex: 0,
      stages: [
        {
          id: 'understand',
          blocks: [
            {
              kind: 'prose',
              body: 'Skimming is reading for shape, not detail. You are building a map you will come back to, and a map does not need every street named.',
            },
            {
              kind: 'callout',
              tone: 'warning',
              title: 'Do not read every word',
              body: 'A full read of a 900-word passage costs you six minutes you will need for the questions. You will read the parts that matter twice anyway.',
            },
          ],
        },
        {
          id: 'see',
          blocks: [
            {
              kind: 'example',
              source:
                'The railways changed that. A timetable is useless if every station keeps its own clock.',
              question: 'What is this paragraph about?',
              answer: 'The railways forcing a shared clock.',
              why: 'The first sentence names the agent of change and the second says why it mattered. That is the whole paragraph, and you found it in two lines.',
            },
          ],
        },
        {
          id: 'try',
          blocks: [
            {
              kind: 'try',
              question:
                'You have ninety seconds and eight paragraphs. What do you read?',
              answer: 'The first and last sentence of each.',
              why: 'Topic sentences carry the claim; closing sentences usually carry its consequence. Between them you have the paragraph’s job, which is all a map needs.',
            },
          ],
        },
      ],
    },
  },
  foundations: {
    label: 'Foundations',
    focus: `A foundations lesson teaches a skill every question type depends on:
skimming, scanning, locating an answer, reading a question stem, managing the
clock, planning an essay, structuring a paragraph.

- questionKind must be null. If the lesson only makes sense for one question
  type, it belongs in "question-types" instead.
- Assume no prior IELTS knowledge and never assume a previous lesson was read.
- Stages: understand, see, try. Keep it under ten minutes.`,
    example: {
      slug: 'locating-before-answering',
      module: 'reading',
      group: 'foundations',
      title: 'Locating before answering',
      summary:
        'Find where the answer lives before you decide what it is. Most wrong answers are right answers to the wrong paragraph.',
      minutes: 7,
      questionKind: null,
      orderIndex: 1,
      stages: [
        {
          id: 'understand',
          blocks: [
            {
              kind: 'prose',
              body: 'Every question in the Reading paper has an address. Before you judge whether a statement is true, find the two or three sentences it is about. Judging first and locating afterwards is how a plausible-sounding wrong answer gets chosen.',
            },
            {
              kind: 'steps',
              items: [
                'Take the noun in the question that is hardest to paraphrase — a name, a number, a technical term.',
                'Scan for it, or for an obvious synonym. Do not read; look.',
                'Read the sentence you land on, plus the one either side.',
                'Only now decide the answer.',
              ],
            },
          ],
        },
        {
          id: 'see',
          blocks: [
            {
              kind: 'example',
              source:
                'Britain did not make Greenwich time its legal standard until 1880, decades after the railways had made it the practical one.',
              question:
                'Statement: Britain made Greenwich time legal before the railways used it. True, False, or Not Given?',
              answer: 'False.',
              why: 'The anchor is "1880". Landing on that sentence gives you both dates in one place, and the order they came in is stated outright. Guessing from memory of paragraph B would have got this wrong.',
            },
          ],
        },
        {
          id: 'try',
          blocks: [
            {
              kind: 'try',
              question:
                'A question asks about "the cost of marine surveys". Which word do you scan for?',
              answer: '"Marine", or the survey vessel term the passage uses.',
              why: '"Cost" will be paraphrased — expensive, costly, budget. The concrete noun survives paraphrase far more often, so it is the better anchor.',
            },
          ],
        },
      ],
    },
  },
  'question-types': {
    label: 'Question types',
    focus: `A question-types lesson teaches one task type and how it is scored.

- questionKind MUST be set, and everything in the lesson is about that kind.
- The "see" stage must contain at least one "example" block worked through in
  full, and the "try" stage one "try" block the reader answers first.
- Name the trap the type is built around: what the examiners set to catch
  someone who half-read the passage.
- Stages: understand, see, try, check.`,
    example: {
      slug: 'matching-headings',
      module: 'reading',
      group: 'question-types',
      title: 'Matching headings',
      summary:
        'Pick the heading that covers the whole paragraph, not the one that matches its most memorable sentence.',
      minutes: 10,
      questionKind: 'matching_headings',
      orderIndex: 0,
      stages: [
        {
          id: 'understand',
          blocks: [
            {
              kind: 'prose',
              body: 'You get one list of headings for several paragraphs, and there are always more headings than paragraphs. A heading is used once or not at all.',
            },
            {
              kind: 'callout',
              tone: 'warning',
              title: 'The trap is the vivid detail',
              body: 'Wrong headings are built from real sentences in the paragraph — usually the most striking one. A heading that matches one sentence and ignores the other five is the wrong heading.',
            },
            {
              kind: 'steps',
              items: [
                'Read the paragraph for its job, not its facts. What is it doing there?',
                'Say that job to yourself in six words before you look at the list.',
                'Find the heading closest to your six words.',
                'Cross it off. Never reuse it.',
              ],
            },
          ],
        },
        {
          id: 'see',
          blocks: [
            {
              kind: 'example',
              source:
                'The railways changed that. A timetable is useless if every station keeps its own clock, and two trains sharing a single track could be separated by a margin no wider than the disagreement between their stations.',
              question:
                'Which fits: "The timetable problem the railways created", or "The dangers of running trains on mismatched clocks"?',
              answer: 'The timetable problem the railways created.',
              why: 'The collision risk is real and it is in the paragraph — which is exactly why it was offered. But it is the consequence the paragraph reaches at the end, not the subject it is about. Your six words were "railways made one clock necessary".',
            },
          ],
        },
        {
          id: 'try',
          blocks: [
            {
              kind: 'try',
              source:
                "Delegates met in Washington in 1884 to settle on a single prime meridian. Greenwich won largely because most of the world's shipping already used charts based on it. International agreement followed the next year.",
              question:
                'Which fits: "Reaching international agreement on a prime meridian", or "How shipping charts settled a political question"?',
              answer: 'Reaching international agreement on a prime meridian.',
              why: 'The shipping charts explain one sentence of three. The paragraph opens with the meeting and closes with the agreement, so the agreement is its job.',
            },
          ],
        },
        {
          id: 'check',
          blocks: [
            {
              kind: 'checklist',
              items: [
                'Did you read the paragraph before looking at the headings?',
                'Does your heading cover the whole paragraph, not one sentence?',
                'Have you used any heading twice?',
                'Did the leftover headings each match a detail rather than a paragraph?',
              ],
            },
          ],
        },
      ],
    },
  },
  advanced: {
    label: 'Advanced',
    focus: `An advanced lesson is for a candidate already scoring around 6.5 who
is stuck below 7.5. Assume the basics are known and do not re-teach them.

- The subject is a distinction that separates a 6.5 from a 7.5: fact versus the
  writer's stance, a paraphrase that survives two removes, hedged language,
  spending the last ten minutes well.
- Say what the mid-band candidate does and why it caps them. Naming the habit
  is most of the lesson.
- Stages: understand, see, try, improve.`,
    example: {
      slug: 'fact-versus-the-writers-view',
      module: 'reading',
      group: 'advanced',
      title: "Fact versus the writer's view",
      summary:
        'Why the same sentence can be True in one question and Yes in another, and what happens when you read the wrong one.',
      minutes: 12,
      questionKind: 'yes_no_not_given',
      orderIndex: 0,
      stages: [
        {
          id: 'understand',
          blocks: [
            {
              kind: 'prose',
              body: 'True/False/Not Given asks whether the passage asserts something. Yes/No/Not Given asks whether the writer believes something. Candidates who treat them as the same question lose marks only on the second, and usually cannot see why.',
            },
            {
              kind: 'prose',
              body: 'The signal is evaluative language: useless, troubled almost nobody, largely because, waited longer still. A sentence carrying a judgement is available for Yes/No. A sentence carrying only a date is not.',
            },
          ],
        },
        {
          id: 'see',
          blocks: [
            {
              kind: 'example',
              source:
                'A timetable is useless if every station keeps its own clock.',
              question:
                'Statement: the writer thinks the railways had no alternative to a shared clock. Yes, No, or Not Given?',
              answer: 'Yes.',
              why: '"Useless" is a judgement, not a measurement. Nobody measured a timetable\'s uselessness — the writer is telling you what they think, and the statement matches it.',
            },
          ],
        },
        {
          id: 'try',
          blocks: [
            {
              kind: 'try',
              source: 'North America solved the same problem more slowly.',
              question:
                'Statement: the writer blames the railroad companies for the delay. Yes, No, or Not Given?',
              answer: 'Not Given.',
              why: '"More slowly" is a comparison, not a criticism, and no sentence assigns responsibility. The temptation is to supply the blame yourself because the following sentences make the companies look careless.',
            },
          ],
        },
        {
          id: 'improve',
          blocks: [
            {
              kind: 'checklist',
              items: [
                'Before answering, name which question you are on: does the passage say it, or does the writer think it?',
                'For Yes/No, find the evaluative word. If there is not one, suspect Not Given.',
                'Check you have not supplied a judgement the passage only implies.',
              ],
            },
          ],
        },
      ],
    },
  },
});

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

type Resource = z.infer<typeof resourceSchema>;

const RESOURCE_BASE = `Write IELTS resource guides as a JSON array matching the example below
exactly. Return JSON only.

- category is one of: strategies, reading, writing, vocabulary, grammar,
  exam-day, listening, speaking. level is beginner, intermediate or advanced.
- module is "reading", "writing" or null. It is null for anything the app
  cannot yet put a practice engine behind, which includes every listening and
  speaking guide.
- questionKind is one of true_false_not_given, yes_no_not_given,
  multiple_choice, matching_headings, sentence_completion, or null.
- orderIndex is optional and sets the position within its category.
- body is an array of paragraphs, one string each. Three to six of them, each a
  real paragraph rather than a bullet in disguise. Omit body or use null for a
  guide that is listed but not yet drafted.
- summary is one sentence and is the only thing shown in the list, so it must
  say what the reader gets, not what the guide is about.
- Concrete over general throughout. A guide that could be about any exam is
  worth nothing.`;

/** module is null wherever the app has no engine behind the skill. */
export const RESOURCE_TEMPLATES = build<Resource>(RESOURCE_BASE, {
  general: {
    label: 'General',
    focus:
      'Any category. The example is a strategies guide, which is the widest\nof them.',
    example: {
      slug: 'managing-the-reading-clock',
      title: 'Managing the reading clock',
      summary:
        'How to spend sixty minutes across three passages without running out of time on the last one.',
      category: 'strategies',
      level: 'intermediate',
      minutes: 6,
      module: 'reading',
      questionKind: null,
      orderIndex: 0,
      body: [
        'Twenty minutes a passage is the only budget that works, and the third passage is the hardest, so the first two have to come in under budget rather than on it. Aim for seventeen minutes on Passage 1 and bank what you save.',
        'Skim first, always. Two minutes spent mapping the passage buys back four on the questions, because you stop re-reading paragraphs looking for where something was.',
        'When a question has cost you ninety seconds, guess it, flag it and move. An unanswered question and a wrong one score the same, and the two questions you never reached at the end were probably easier than the one you were stuck on.',
      ],
    },
  },
  strategies: {
    label: 'Strategies',
    focus: `A strategies guide is about how to sit the exam, not about English.
Time budgets, question order, guessing, transferring answers, what to do when
you are lost. It must apply across more than one module, or it belongs in that
module's category instead.`,
    example: {
      slug: 'when-to-guess-and-move-on',
      title: 'When to guess and move on',
      summary:
        'The ninety-second rule, and why the question you abandon costs you less than the two you never reach.',
      category: 'strategies',
      level: 'beginner',
      minutes: 5,
      module: null,
      questionKind: null,
      orderIndex: 1,
      body: [
        'There is no penalty for a wrong answer in IELTS. That single fact decides how you should behave when you are stuck: a guess is free, and a blank is a guaranteed zero.',
        'Give any one question ninety seconds. When that is gone, put down your best guess, mark it, and go. You are not abandoning it — you are buying the chance to come back with the rest of the paper answered.',
        'The cost of stubbornness is invisible, which is why candidates keep paying it. Four minutes lost on question 11 does not feel like anything until you are reading question 37 with two minutes left, and questions 38 to 40 turn out to be the easiest on the paper.',
        'On reading and listening, transfer or check your answer sheet as you go rather than at the end. Every year candidates lose real marks to answers that were correct on the question paper and never made it across.',
      ],
    },
  },
  reading: {
    label: 'Reading',
    focus: `A reading guide is about the Reading paper specifically: how to
handle a passage or a task type, what the paper rewards, where marks leak.

- Set module to "reading". Set questionKind when the guide is about one task
  type; leave it null when it is about the paper as a whole.
- Quote or paraphrase real passage-like prose rather than talking abstractly
  about "the text".`,
    example: {
      slug: 'skimming-versus-scanning',
      title: 'Skimming versus scanning',
      summary:
        'Two different reading speeds for two different jobs, and what goes wrong when you use one for the other.',
      category: 'reading',
      level: 'beginner',
      minutes: 6,
      module: 'reading',
      questionKind: null,
      orderIndex: 0,
      body: [
        'Skimming is reading fast for shape: what is this paragraph doing, and where does the argument turn? You do it once, before the questions, and you come away with a map rather than any facts.',
        'Scanning is hunting for one thing you already know you want — a year, a name, a term you cannot paraphrase. Your eyes move over the page without reading it at all, and they stop when the shape matches.',
        'The common mistake is scanning when the question needs skimming. Matching headings cannot be scanned: there is no word to hunt for, because the answer is about what the whole paragraph does. Candidates who scan for a keyword and find it in one sentence pick the heading built from that sentence, which is the distractor.',
        'The opposite mistake costs less but still costs. Skimming when you should scan means re-reading three paragraphs to find a date that was sitting in plain sight.',
      ],
    },
  },
  writing: {
    label: 'Writing',
    focus: `A writing guide is about producing Task 1 or Task 2 answers:
structure, paragraphing, planning, the band descriptors, the difference between
250 words that score 6 and 250 that score 7.

- Set module to "writing".
- Show sentences. A guide about writing that contains no example sentences is
  advice the reader cannot act on.`,
    example: {
      slug: 'paragraphing-a-task-2-essay',
      title: 'Paragraphing a Task 2 essay',
      summary:
        'Four paragraphs, one idea each, and where the examiner looks for Coherence and Cohesion marks.',
      category: 'writing',
      level: 'intermediate',
      minutes: 8,
      module: 'writing',
      questionKind: null,
      orderIndex: 0,
      body: [
        'Four paragraphs answer almost every Task 2 prompt: introduction, one body paragraph per position or reason, conclusion. Five is fine. Two is not, and an essay written as one block of text caps Coherence and Cohesion at band 5 no matter how good the English is.',
        'Each body paragraph carries one idea, announced in its first sentence. "The clearest benefit of remote work is the time it returns to employees." Everything after that sentence must be about that benefit — an explanation, then a specific example, then the consequence.',
        'Cohesion is not a supply of linking words. Sprinkling Moreover, Furthermore and In addition across an essay whose ideas do not connect is visible to the examiner and is penalised as mechanical. The link that earns marks is one that names the relationship: "That saving matters most to the people with the longest commutes, which is why the effect is uneven."',
        'Plan for five minutes before writing. Write the four topic sentences and nothing else. If the four do not answer the question when read on their own, no amount of good English in between will fix it.',
      ],
    },
  },
  vocabulary: {
    label: 'Vocabulary',
    focus: `A vocabulary guide is about Lexical Resource: precision,
collocation, register, topic sets, and the difference between a word the
candidate knows and one they can use.

- module is null unless the guide is genuinely about one paper.
- Give real word lists and real sentences, with the wrong version alongside the
  right one. Never recommend a "sophisticated" word for its own sake.`,
    example: {
      slug: 'collocations-examiners-notice',
      title: 'Collocations examiners notice',
      summary:
        'Why "make a decision" scores and "do a decision" does not, and the twenty pairs worth learning as pairs.',
      category: 'vocabulary',
      level: 'intermediate',
      minutes: 7,
      module: null,
      questionKind: null,
      orderIndex: 0,
      body: [
        'Lexical Resource rewards words used naturally, not words that are rare. A candidate who writes "The government should take strong measures" scores better than one who writes "The government should undertake vigorous ameliorations", because the first sounds like English and the second sounds like a thesaurus.',
        'Collocation is which words go together, and it is invisible until you get it wrong. Make a decision, take a risk, pay attention, draw a conclusion, raise a question, meet a deadline, reach an agreement. None of these can be swapped: you do not do a decision or make attention.',
        'Learn them in pairs, never as single words. A vocabulary list of nouns teaches you nothing about which verb they take, which is exactly the part the examiner hears.',
        'Where you are unsure, choose the plainer version. An accurate simple word costs you nothing; an ambitious wrong one costs you a band, because it reads as a word the candidate does not actually control.',
      ],
    },
  },
  grammar: {
    label: 'Grammar',
    focus: `A grammar guide is about Grammatical Range and Accuracy: sentence
variety, tense control, articles, the errors that recur at each band.

- module is null unless the guide is genuinely about one paper.
- Name the error, show it, then show the fix. "Use complex sentences" is not a
  guide; a sentence rewritten three ways is.`,
    example: {
      slug: 'complex-sentences-without-losing-the-reader',
      title: 'Complex sentences without losing the reader',
      summary:
        'Range means variety, not length. Three ways to join two ideas, and when each one is the right choice.',
      category: 'grammar',
      level: 'intermediate',
      minutes: 8,
      module: null,
      questionKind: null,
      orderIndex: 0,
      body: [
        'Grammatical Range asks for a mix of sentence types, and candidates hear it as a demand for long sentences. The result is a paragraph of forty-word sentences held together by "and which", losing a mark for accuracy for every mark it gains for range.',
        'Take two ideas: "Remote work saves commuting time. Younger employees learn less." There are three useful ways to join them. Subordination: "Although remote work saves commuting time, younger employees learn less." A relative clause: "Remote work, which saves employees an hour a day, leaves younger staff with less to learn from." A participle: "Saving an hour a day, remote workers also see less of the colleagues they would learn from."',
        'Each says something slightly different, and that is the point. The subordinator concedes; the relative clause adds detail in passing; the participle links cause to effect. Choosing between them is range. Writing all three in one sentence is not.',
        'A reliable target: in each body paragraph, one simple sentence, two compound or complex ones, and one that begins with something other than the subject. Then stop. An error-free paragraph of four varied sentences outscores six ambitious broken ones.',
      ],
    },
  },
  'exam-day': {
    label: 'Exam day',
    focus: `An exam-day guide is about the day itself: what to bring, what
happens in the room, the order of the papers, timing between them, the computer
versus paper difference, what to do when something goes wrong.

- module is null.
- Practical and checkable. No study advice — by exam day it is too late for it,
  and saying so is more useful than pretending otherwise.`,
    example: {
      slug: 'the-hour-before-the-test',
      title: 'The hour before the test',
      summary:
        'What to bring, what to leave, and what to do with the last sixty minutes so you start the Listening awake.',
      category: 'exam-day',
      level: 'beginner',
      minutes: 5,
      module: null,
      questionKind: null,
      orderIndex: 0,
      body: [
        "Bring the identity document you booked with — the same one, not a different valid one — and a transparent bottle of water. Pens, pencils and erasers are usually provided; check your centre's note, because a centre that provides them will not let you use your own.",
        'Everything else goes in the locker: phone, watch, notes, bag. There is a clock in the room. A smartwatch left on a wrist is treated as cheating, and the penalty is your whole result, not that paper.',
        'Do not revise in the last hour. Nothing learned now will arrive in time, and the anxiety of discovering a gap will cost you more than the gap would have. Read something easy in English instead — a news article is ideal — so the first English you hear in the Listening is not the first English of your day.',
        'Eat something. The four papers run back to back with no meal break, and a candidate who skipped breakfast is measurably worse by the Writing paper, which is the one that needs the most sustained concentration.',
      ],
    },
  },
  listening: {
    label: 'Listening',
    focus: `A listening guide is about the Listening paper: the four sections,
the task types, accents, spelling, and the fact that the recording plays once.

- Set module to null. There is no listening practice engine yet, so a guide
  that promises one would be a promise the app cannot keep. Say what to
  practise and how, not "try it here".
- Sections run 1 to 4: a social conversation, a social monologue, an academic
  discussion, an academic lecture, getting harder as they go.
- The recording is played once only, and answers are written as you listen.
  Every piece of advice has to survive that constraint.
- Spelling and number formats are marked. A correct answer spelled wrong is
  wrong.`,
    example: {
      slug: 'map-and-plan-labelling',
      title: 'Map and plan labelling',
      summary:
        'How to follow spoken directions across a map in Section 2 without losing your place when the speaker doubles back.',
      category: 'listening',
      level: 'intermediate',
      minutes: 7,
      module: null,
      questionKind: null,
      orderIndex: 0,
      body: [
        'Map labelling almost always appears in Section 2, where one speaker describes a place — a leisure centre, a campus, a nature reserve — to someone who has not seen it. You are given the map and a set of labels, and the recording moves around the map in one continuous route.',
        'Use the preparation seconds to orient yourself before a word is spoken. Find the entrance, the compass point if there is one, and read the labels already printed on the map. Those printed labels are the landmarks the speaker will navigate by, and they are the only fixed points you have.',
        'Track the speaker with your pencil tip, moving it as they move. The task is not really listening comprehension; it is not losing your place. When you hear "if you go past the café and turn left", the pencil should already be at the café.',
        'The trap is the correction. Speakers routinely say "the library is on your right — sorry, that is the archive, the library is the next one along". The first noun you hear is often the wrong one, so never write a label until the sentence has finished.',
        'To practise without an engine: play any recorded walking tour or campus tour with a map open in front of you, at normal speed, once. Stopping and replaying teaches you nothing about the paper, because the paper does not stop.',
      ],
    },
  },
  speaking: {
    label: 'Speaking',
    focus: `A speaking guide is about the three-part interview: Part 1 personal
questions, Part 2 the long turn from a cue card, Part 3 the abstract discussion.

- Set module to null. There is no speaking practice engine yet, so tell the
  reader how to rehearse on their own rather than pointing at a feature that
  does not exist.
- The examiner is a person, the test is recorded, and it lasts 11 to 14
  minutes. Fluency and Coherence, Lexical Resource, Grammatical Range and
  Accuracy, and Pronunciation are scored separately and equally.
- Give the candidate actual phrases to say, and say when each one is
  appropriate. Advice like "be confident" is not usable in a test room.`,
    example: {
      slug: 'signposting-language-for-part-3',
      title: 'Signposting language for Part 3',
      summary:
        'The phrases that buy you thinking time and structure an abstract answer, and the ones that sound rehearsed.',
      category: 'speaking',
      level: 'advanced',
      minutes: 8,
      module: null,
      questionKind: null,
      orderIndex: 0,
      body: [
        'Part 3 is the abstract half: the examiner takes the Part 2 topic and asks what it means for society, how it has changed, whether it will continue. Answers are expected to be longer and more developed than in Part 1, and the commonest failure is not a lack of English but running out of structure after one sentence.',
        'Signposting is how you buy a second to think while still speaking. "That is an interesting one — I suppose it depends on…", "I have not thought about it in those terms, but my instinct is…", "There are two sides to this, and I lean towards…". Each of these is natural English, each is doing real work, and each gives you three or four seconds.',
        'Then take a shape and follow it. Position, reason, example, qualification: "I think museums should stay free. The reason is access — the moment there is a ticket price, the visit becomes a decision rather than a habit. In London the free national museums are full of people who dropped in for half an hour. That said, it clearly depends on whether the government will fund the shortfall."',
        'Avoid the memorised opener. "Well, that is a very good question and in my opinion I would like to say that…" is recognised instantly and marked down under Fluency and Coherence, because it is not a response to anything. Hesitating naturally scores better than reciting.',
        'To rehearse alone: record yourself answering one abstract question for ninety seconds without stopping, then listen back for the point where the structure ran out. That point, not your vocabulary, is what is capping your band.',
      ],
    },
  },
});

// ---------------------------------------------------------------------------

export const TEMPLATES = {
  passages: PASSAGE_TEMPLATES,
  listening: LISTENING_TEMPLATES,
  speaking: SPEAKING_TEMPLATES,
  'writing-prompts': WRITING_PROMPT_TEMPLATES,
  lessons: LESSON_TEMPLATES,
  resources: RESOURCE_TEMPLATES,
} satisfies Record<string, TemplateOption[]>;
