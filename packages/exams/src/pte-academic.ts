import {
  ONE_PLAY,
  SECTION_TIMED,
  mins,
  task,
  timed,
  withItems,
  withScoring,
  withWords,
} from './task.ts';
import type { ExamDefinition, ScoringTrait, TaskScoring } from './types.ts';

/**
 * PTE Academic after the 7 August 2025 update, which added Summarize Group
 * Discussion and Respond to a Situation (22 scored task types).
 *
 * Everything here — the communicative skills each task credits, the section
 * lengths, the item counts — is taken from Pearson's *Test Taker Score Guide*
 * (July 2025), which is the only place Pearson publishes it. An earlier
 * version of this file was written from Pearson's "changes 2025" article and
 * got five of the skill mappings wrong, because they match the April 2021
 * guide and Pearson has since changed them.
 *
 * Two of the guide's own caveats matter to anything reading this:
 *
 * - Section ranges do not sum to the test's length. Pearson balances versions
 *   for total length, so no candidate gets all the maxima or all the minima.
 *   `duration` is Pearson's stated figure; summing `minutes` is wrong.
 * - The overall score is explicitly *not* an average of the communicative
 *   skills scores. `pteScoreReport` averages them anyway, because Pearson does
 *   not publish the real weighting — see issue #121.
 *
 * ponytail: per-task times are Pearson's published windows; the within-section
 * items (Reading, most of Listening) share the section clock. Calibrate against
 * the official practice test before building a timed PTE mock.
 */
// ---------------------------------------------------------------------------
// Raw scoring, per task type, from the guide's "Traits scored" column
// (pp. 15-44) and its Pronunciation and Oral Fluency criteria (pp. 45-46).
//
// Only the published raw rules live here. How raw scores become 10-90 is not
// published and is Bandzen's estimate, in `pte-scoring.ts`.
// ---------------------------------------------------------------------------

const byModel = (key: string, max: number): ScoringTrait => ({
  key,
  max,
  source: 'model',
});
/** Pearson: a zero for Content or Form means no score points for the response. */
const gate = (t: ScoringTrait): ScoringTrait => ({ ...t, gate: true });

const FLUENCY = byModel('Oral fluency', 5);
const PRONUNCIATION = byModel('Pronunciation', 5);

/** Describe Image, Re-tell Lecture, Summarize Group Discussion, Respond to a Situation. */
const OPEN_SPEAKING: TaskScoring = {
  mode: 'partial',
  traits: [gate(byModel('Content', 6)), PRONUNCIATION, FLUENCY],
};

const READ_ALOUD: TaskScoring = {
  mode: 'partial',
  traits: [
    // One point per word of the text, less one per replaced, omitted or
    // inserted word.
    gate({ key: 'Content', max: 'reference_words', source: 'deterministic' }),
    PRONUNCIATION,
    FLUENCY,
  ],
};

const REPEAT_SENTENCE: TaskScoring = {
  mode: 'partial',
  traits: [
    gate({ key: 'Content', max: 3, source: 'deterministic' }),
    PRONUNCIATION,
    FLUENCY,
  ],
};

/** Correct or incorrect: "appropriate word choice in response". */
const ANSWER_SHORT_QUESTION: TaskScoring = {
  mode: 'binary',
  traits: [{ key: 'Vocabulary', max: 1, source: 'deterministic' }],
};

const SUMMARIZE_WRITTEN_TEXT: TaskScoring = {
  mode: 'partial',
  traits: [
    gate(byModel('Content', 4)),
    gate({ key: 'Form', max: 1, source: 'deterministic' }),
    byModel('Grammar', 2),
    byModel('Vocabulary', 2),
  ],
};

const WRITE_ESSAY: TaskScoring = {
  mode: 'partial',
  traits: [
    gate(byModel('Content', 6)),
    gate({ key: 'Form', max: 2, source: 'deterministic' }),
    byModel('Development, structure and coherence', 6),
    byModel('Grammar', 2),
    byModel('General linguistic range', 6),
    byModel('Vocabulary range', 2),
    byModel('Spelling', 2),
  ],
};

const SUMMARIZE_SPOKEN_TEXT: TaskScoring = {
  mode: 'partial',
  traits: [
    gate(byModel('Content', 4)),
    gate({ key: 'Form', max: 2, source: 'deterministic' }),
    byModel('Grammar', 2),
    byModel('Vocabulary', 2),
    byModel('Spelling', 2),
  ],
};

export const PTE_ACADEMIC = {
  key: 'pte_academic',
  name: 'PTE Academic',
  version: '2025-08-07',
  source:
    'https://www.pearsonpte.com/ctf-assets/yqwtwibiobs4/WUcBAMkYCC9Dj5vs2HfVA/941d88d07ba7c2a5007f7ce1b18eedbf/Score_Guide__Test_Taker__-_PTE_Academic_-_July_2025__web_.pdf',
  duration: 'About 2 hr 15 min',
  // The guide: "between 65–75 questions in any given test".
  totalItems: { min: 65, max: 75 },
  variants: [],
  scoreScale: { label: 'Score', min: 10, max: 90, step: 1 },
  targetRange: { min: 30, max: 90, step: 5 },
  sections: [
    {
      key: 'speaking_writing',
      label: 'Speaking & Writing',
      skills: ['speaking', 'writing'],
      minutes: mins(76, 84),
    },
    {
      key: 'reading',
      label: 'Reading',
      skills: ['reading'],
      minutes: mins(23, 30),
    },
    {
      key: 'listening',
      label: 'Listening',
      skills: ['listening'],
      minutes: mins(31, 39),
    },
  ],
  tasks: [
    withScoring(
      withItems(
        task(
          'speaking_writing',
          'read_aloud',
          'Read Aloud',
          'text',
          'audio',
          'recording',
          'speaking_model',
          ['speaking'],
          timed(35, 40),
        ),
        6,
        7,
      ),
      READ_ALOUD,
    ),
    withScoring(
      withItems(
        task(
          'speaking_writing',
          'repeat_sentence',
          'Repeat Sentence',
          'audio',
          'audio',
          'recording',
          'speaking_model',
          ['listening', 'speaking'],
          timed(0, 15),
          ONE_PLAY,
        ),
        10,
        12,
      ),
      REPEAT_SENTENCE,
    ),
    withScoring(
      withItems(
        task(
          'speaking_writing',
          'describe_image',
          'Describe Image',
          'image',
          'audio',
          'recording',
          'speaking_model',
          ['speaking'],
          timed(25, 40),
        ),
        5,
        6,
      ),
      OPEN_SPEAKING,
    ),
    withScoring(
      withItems(
        task(
          'speaking_writing',
          'retell_lecture',
          'Re-tell Lecture',
          'mixed',
          'audio',
          'recording',
          'speaking_model',
          ['listening', 'speaking'],
          timed(10, 40),
          ONE_PLAY,
        ),
        2,
        3,
      ),
      OPEN_SPEAKING,
    ),
    withScoring(
      withItems(
        task(
          'speaking_writing',
          'answer_short_question',
          'Answer Short Question',
          'audio',
          'audio',
          'recording',
          'speaking_model',
          ['listening'],
          timed(0, 10),
          ONE_PLAY,
        ),
        5,
        6,
      ),
      ANSWER_SHORT_QUESTION,
    ),
    withScoring(
      withItems(
        task(
          'speaking_writing',
          'summarize_group_discussion',
          'Summarize Group Discussion',
          'audio',
          'audio',
          'recording',
          'speaking_model',
          ['listening', 'speaking'],
          timed(10, 120),
          ONE_PLAY,
        ),
        2,
        3,
      ),
      OPEN_SPEAKING,
    ),
    withScoring(
      withItems(
        task(
          'speaking_writing',
          'respond_to_a_situation',
          'Respond to a Situation',
          'mixed',
          'audio',
          'recording',
          'speaking_model',
          ['speaking'],
          timed(10, 40),
          ONE_PLAY,
        ),
        2,
        3,
      ),
      OPEN_SPEAKING,
    ),
    withScoring(
      withItems(
        withWords(
          task(
            'speaking_writing',
            'summarize_written_text',
            'Summarize Written Text',
            'text',
            'text',
            'essay',
            'writing_model',
            ['reading', 'writing'],
            timed(0, 600),
          ),
          5,
          75,
        ),
        2,
      ),
      SUMMARIZE_WRITTEN_TEXT,
    ),
    withScoring(
      withItems(
        withWords(
          task(
            'speaking_writing',
            'write_essay',
            'Write Essay',
            'text',
            'text',
            'essay',
            'writing_model',
            ['writing'],
            timed(0, 1200),
          ),
          200,
          300,
        ),
        1,
      ),
      WRITE_ESSAY,
    ),
    withItems(
      task(
        'reading',
        'reading_writing_fill_in_the_blanks',
        'Reading & Writing: Fill in the Blanks',
        'text',
        'fill_blank',
        'fill_blank_select',
        'gap_match',
        ['reading'],
      ),
      5,
      6,
    ),
    withItems(
      task(
        'reading',
        'reading_multiple_choice_multiple',
        'Multiple Choice, Multiple Answers',
        'text',
        'multi_choice',
        'multi_choice',
        'multi_match',
        ['reading'],
      ),
      2,
      3,
    ),
    withItems(
      task(
        'reading',
        'reorder_paragraphs',
        'Re-order Paragraphs',
        'text',
        'reorder',
        'reorder',
        'order_match',
        ['reading'],
      ),
      2,
      3,
    ),
    withItems(
      task(
        'reading',
        'reading_fill_in_the_blanks',
        'Reading: Fill in the Blanks',
        'text',
        'fill_blank',
        'fill_blank_drag',
        'gap_match',
        ['reading'],
      ),
      4,
      5,
    ),
    withItems(
      task(
        'reading',
        'reading_multiple_choice_single',
        'Multiple Choice, Single Answer',
        'text',
        'single_choice',
        'choice_cards',
        'exact_match',
        ['reading'],
      ),
      2,
      3,
    ),
    withScoring(
      withItems(
        withWords(
          task(
            'listening',
            'summarize_spoken_text',
            'Summarize Spoken Text',
            'audio',
            'text',
            'essay',
            'writing_model',
            ['listening', 'writing'],
            timed(0, 600),
            ONE_PLAY,
          ),
          50,
          70,
        ),
        1,
      ),
      SUMMARIZE_SPOKEN_TEXT,
    ),
    withItems(
      task(
        'listening',
        'listening_multiple_choice_multiple',
        'Multiple Choice, Multiple Answers',
        'audio',
        'multi_choice',
        'multi_choice',
        'multi_match',
        ['listening'],
        SECTION_TIMED,
        ONE_PLAY,
      ),
      2,
      3,
    ),
    withItems(
      task(
        'listening',
        'listening_fill_in_the_blanks',
        'Fill in the Blanks',
        'audio',
        'fill_blank',
        'fill_blank',
        'gap_match',
        ['listening'],
        SECTION_TIMED,
        ONE_PLAY,
      ),
      2,
      3,
    ),
    withItems(
      task(
        'listening',
        'highlight_correct_summary',
        'Highlight Correct Summary',
        'audio',
        'single_choice',
        'choice_cards',
        'exact_match',
        ['listening', 'reading'],
        SECTION_TIMED,
        ONE_PLAY,
      ),
      2,
      3,
    ),
    withItems(
      task(
        'listening',
        'listening_multiple_choice_single',
        'Multiple Choice, Single Answer',
        'audio',
        'single_choice',
        'choice_cards',
        'exact_match',
        ['listening'],
        SECTION_TIMED,
        ONE_PLAY,
      ),
      2,
      3,
    ),
    withItems(
      task(
        'listening',
        'select_missing_word',
        'Select Missing Word',
        'audio',
        'single_choice',
        'choice_cards',
        'exact_match',
        ['listening'],
        SECTION_TIMED,
        ONE_PLAY,
      ),
      1,
      2,
    ),
    withItems(
      task(
        'listening',
        'highlight_incorrect_words',
        'Highlight Incorrect Words',
        'audio',
        'multi_choice',
        'token_select',
        'multi_match',
        ['listening', 'reading'],
        SECTION_TIMED,
        ONE_PLAY,
      ),
      2,
      3,
    ),
    withItems(
      task(
        'listening',
        'write_from_dictation',
        'Write from Dictation',
        'audio',
        'text',
        'text_input',
        'dictation_match',
        ['listening', 'writing'],
        SECTION_TIMED,
        ONE_PLAY,
      ),
      3,
      4,
    ),
  ],
} as const satisfies ExamDefinition;
