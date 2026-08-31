import type { Skill } from '@/lib/db/schema';
import type { QuestionKind } from '@/lib/modules';

/**
 * Reference material. Short, practical, and pointed at something to do next.
 *
 * Authored here for the same reason lessons are: the text changes far more
 * often than the shape, and a wording fix should be a diff rather than a
 * migration. A resource without `body` is listed and marked unwritten.
 */

export const RESOURCE_CATEGORIES = [
  'strategies',
  'reading',
  'writing',
  'vocabulary',
  'grammar',
  'exam-day',
  'listening',
  'speaking',
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const CATEGORY_TITLE: Record<ResourceCategory, string> = {
  strategies: 'Strategies',
  reading: 'Reading',
  writing: 'Writing',
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  'exam-day': 'Exam day',
  listening: 'Listening',
  speaking: 'Speaking',
};

export type ResourceLevel = 'beginner' | 'intermediate' | 'advanced';

export type Resource = {
  id: string;
  title: string;
  summary: string;
  category: ResourceCategory;
  level: ResourceLevel;
  minutes: number;
  /** The module this belongs to, where it maps to one we can practise. */
  module?: Skill;
  questionKind?: QuestionKind;
  /** Paragraphs. Absent means written down as needed but not yet drafted. */
  body?: readonly string[];
};

export const RESOURCES: readonly Resource[] = [
  {
    id: 'true-false-not-given-quick-reference',
    title: 'True / False / Not Given: a quick reference',
    summary:
      'The three answers, what each one requires, and the test to apply when you are stuck between False and Not Given.',
    category: 'reading',
    level: 'beginner',
    minutes: 4,
    module: 'reading',
    questionKind: 'true_false_not_given',
    body: [
      'TRUE means the passage states the claim, or states something that means the same thing in different words. FALSE means the passage states the opposite. NOT GIVEN means the passage does not address it either way.',
      'The test when you are stuck: try to underline the words in the passage that disagree with the statement. If you can, the answer is FALSE. If you cannot — if the passage is simply silent, or only partly overlaps — the answer is NOT GIVEN.',
      'Two traps account for most lost marks. The first is answering from your own knowledge instead of from the passage. The second is treating an added qualifier as agreement: "some researchers argue" is not the same claim as "researchers argue", and "often" is not "always".',
    ],
  },
  {
    id: 'paraphrase-signals',
    title: 'How IELTS disguises an answer',
    summary:
      'The four ways a passage restates a question so that scanning for the exact words fails.',
    category: 'reading',
    level: 'intermediate',
    minutes: 5,
    module: 'reading',
    body: [
      'Synonym substitution is the obvious one: the question says "expensive", the passage says "costly". Worth expecting, rarely enough on its own.',
      'Word-form change is next. The question uses a noun where the passage uses a verb — "the decline in numbers" against "numbers declined". Scanning for the noun finds nothing.',
      'Voice change moves the actor: "the council funded the scheme" becomes "the scheme was funded by the council". The words are all there, in a different order, with a different subject.',
      'Numerical restatement is the one candidates miss most. The question says "more than half"; the passage says "58 per cent". Nothing is paraphrased — the fact is expressed in a different unit, and only reading for meaning catches it.',
    ],
  },
  {
    id: 'task-2-planning',
    title: 'Planning a Task 2 essay in five minutes',
    summary:
      'What to decide before you write, and why writing without deciding costs more time than planning does.',
    category: 'writing',
    level: 'beginner',
    minutes: 5,
    module: 'writing',
    body: [
      'Spend the first five minutes of your forty deciding three things: your position, your first idea, and your second idea. Write them as fragments in the margin. Nothing else.',
      'The reason is Task Response. Candidates who start writing immediately discover their argument as they go, which produces a first body paragraph that does not match the conclusion and an introduction that promised something else. Fixing that mid-essay costs more than five minutes.',
      'If you cannot think of a second idea in five minutes, take your first idea and argue the other side of it, then say why your side still wins. A concession you answer is a developed argument, and it is often stronger than two unrelated points.',
    ],
  },
  {
    id: 'band-6-vs-band-7-writing',
    title: 'What separates Band 6 from Band 7 in Writing',
    summary:
      'The four criteria, and the single change in each that moves a band.',
    category: 'writing',
    level: 'intermediate',
    minutes: 6,
    module: 'writing',
    body: [
      'Task Response: a Band 6 answer addresses the question but develops its ideas unevenly — some paragraphs assert without explaining. A Band 7 answer develops every main idea it raises. The change is fewer ideas, taken further.',
      'Coherence and Cohesion: Band 6 uses linking words, sometimes mechanically or inaccurately. Band 7 organises information logically and each paragraph has a clear central topic. The change is usually deleting connectives, not adding them.',
      'Lexical Resource: Band 6 has enough vocabulary but makes noticeable errors in word choice and collocation. Band 7 uses less common vocabulary with only occasional imprecision. The change is accuracy, not range — a plain word used correctly beats an ambitious one used wrongly.',
      'Grammatical Range and Accuracy: Band 6 mixes simple and complex sentences with errors that sometimes impede communication. Band 7 has frequent error-free sentences. The change is proofreading: four minutes at the end finds more marks than a fifth paragraph.',
    ],
  },
  {
    id: 'academic-collocations',
    title: 'Twenty academic collocations worth memorising',
    summary:
      'Phrases rather than single words, so they cannot be used in the wrong company.',
    category: 'vocabulary',
    level: 'intermediate',
    minutes: 6,
    module: 'writing',
    body: [
      'Learn vocabulary in phrases. A single word learned alone gets used in the wrong company; a phrase carries its own grammar with it.',
      'For change: a sharp decline in, a steady increase in, fluctuate considerably, level off at, reach a peak of.',
      'For argument: pose a serious threat to, play a significant role in, place emphasis on, draw a distinction between, be widely regarded as.',
      'For cause and effect: give rise to, stem largely from, contribute directly to, have a detrimental effect on, be attributable to.',
      'For concession: while it is true that, this argument overlooks, there is some merit in, this does not, however, account for.',
    ],
  },
  {
    id: 'article-errors',
    title: 'Articles: the errors examiners notice',
    summary:
      'A, an, the, and nothing at all — the four choices and when each is right.',
    category: 'grammar',
    level: 'intermediate',
    minutes: 5,
    module: 'writing',
    body: [
      'Use "a" or "an" when you introduce a countable thing for the first time, or when any one of a group would do. Use "the" when the reader already knows which one you mean — because you have mentioned it, because there is only one, or because the sentence makes it specific.',
      'Use no article at all for uncountable nouns and for plurals used generally. "Governments should invest in education" takes nothing; "the education system in Finland" takes "the" because it is specified.',
      'The most common error in IELTS essays is a missing "the" before a specified noun: "the number of cars" needs it, "cars" does not. The second most common is an article before an abstract noun used generally — "the pollution is increasing" should be "pollution is increasing".',
    ],
  },
  {
    id: 'exam-day-checklist',
    title: 'Exam day: what to do and what to stop doing',
    summary: 'The last forty-eight hours, and the hour before you sit down.',
    category: 'exam-day',
    level: 'beginner',
    minutes: 4,
    body: [
      'Two days before, stop learning new material. Nothing you learn in the last forty-eight hours will be reliable under exam pressure, and the attempt costs you sleep, which will be.',
      'The day before, sit one timed reading passage and write one introduction. Enough to stay warm, not enough to tire you. Then stop.',
      'On the day, bring the identification document you registered with — the same one, not a different valid one. Eat something. Arrive early enough that being late is not a possibility you are thinking about while reading Passage 1.',
      'In the exam, write answers straight onto the answer sheet in Reading. There is no transfer time. If you plan to transfer at the end, you are planning to lose marks.',
    ],
  },
  {
    id: 'listening-note-taking',
    title: 'Listening: predicting before the audio starts',
    summary:
      'Using the preparation time you are given, which most candidates waste.',
    category: 'listening',
    level: 'beginner',
    minutes: 5,
  },
  {
    id: 'speaking-part-2-structure',
    title: 'Speaking Part 2: filling two minutes',
    summary: 'What to write on the card during your minute of preparation.',
    category: 'speaking',
    level: 'beginner',
    minutes: 5,
  },
  {
    id: 'building-a-study-week',
    title: 'Building a study week that survives contact with real life',
    summary: 'Why a plan you keep at 60% beats a plan you abandon in week two.',
    category: 'strategies',
    level: 'beginner',
    minutes: 5,
  },
];

const BY_ID = new Map(RESOURCES.map((r) => [r.id, r]));

export function getResource(id: string) {
  return BY_ID.get(id) ?? null;
}
