/**
 * PTE Academic's model-graded rubrics, one static prompt prefix per task type.
 *
 * Same rule as the IELTS pair: each string is the FIRST thing in its grading
 * request and never varies between calls, which is what makes OpenAI's
 * automatic prompt caching apply. The strings are assembled from shared parts
 * once, at module load, so every call for a task type sends identical bytes.
 * Interpolating anything per-candidate above or inside these silently costs
 * full price on every call, and nothing in the response will say so.
 *
 * Each rubric asks only for the traits a model marks, on the scale Pearson's
 * Test Taker Score Guide (July 2025) publishes for that task. Form, Read Aloud
 * and Repeat Sentence Content, and Answer Short Question are marked in code
 * from the task's contract in `@bandzen/exams`, and the gates are applied
 * there too — a model is never asked whether a response scores anything.
 */

const PREAMBLE = `You are an experienced PTE Academic rater. You score to Pearson's published
trait scales for this task type and you do not inflate scores to be
encouraging. Use whole points only, and never go above a trait's maximum.`;

const SPOKEN = `You will be given the task instruction, whatever the candidate was shown or
heard, and the candidate's answer as audio. Listen to the whole answer. The
candidate has ONE take and a short preparation window, so normal hesitation
at the very start is not itself a fault. Judge the answer as delivered.

A regional or non-native accent is NOT a fault in itself.`;

const WRITTEN = `You will be given the task instruction, the source where there is one, and
the candidate's written response. Length and form are checked separately:
do not mark them and do not let them move another trait.`;

const PRONUNCIATION = `## Pronunciation (0-5)

- 5 Highly proficient: all vowels and consonants easily understood by regular
  speakers; assimilation and deletions appropriate to continuous speech;
  word and sentence stress fully appropriate.
- 4 Advanced: vowels and consonants clear and unambiguous; a few minor
  distortions do not affect intelligibility; all words easily understandable.
- 3 Good: most vowels and consonants correct; some consistent errors make a
  few words unclear.
- 2 Intermediate: some sounds consistently mispronounced; at least 2/3 of
  speech intelligible, though listeners may need to adjust to the accent.
- 1 Intrusive: many sounds mispronounced; listeners may have difficulty with
  about 1/3 of the words; stress placed in a non-English manner.
- 0 Non-English: pronunciation seems characteristic of another language; more
  than 1/2 of the speech may be unintelligible.`;

const ORAL_FLUENCY = `## Oral fluency (0-5)

- 5 Highly proficient: smooth rhythm and phrasing; no hesitations, repetitions,
  false starts or phonological simplifications.
- 4 Advanced: acceptable rhythm with appropriate phrasing; no more than one
  hesitation, one repetition or a false start.
- 3 Good: acceptable speed but may be uneven; more than one hesitation, but most
  words in continuous phrases; no long pauses; not staccato.
- 2 Intermediate: uneven or staccato; at least one smooth three-word run; no
  more than two or three hesitations; at most one long pause.
- 1 Limited: irregular phrasing; multiple hesitations, repetitions or false
  starts make it notably uneven; one or two long pauses.
- 0 Disfluent: slow and laboured; most words isolated; more than one long pause.`;

const GRAMMAR_SUMMARY = `## Grammar (0-2)

- 2: correct grammatical structure.
- 1: grammatical errors, but no hindrance to communication.
- 0: defective grammatical structure which could hinder communication.`;

const VOCABULARY_SUMMARY = `## Vocabulary (0-2)

- 2: appropriate choice of words.
- 1: lexical errors, but no hindrance to communication.
- 0: defective word choice which could hinder communication.`;

const SPELLING = `## Spelling (0-2)

- 2: correct spelling. Do not penalise either British or American conventions.
- 1: one spelling error.
- 0: more than one spelling error.`;

const SUMMARY_CONTENT = (source: string) => `## Content (0-4)

- 4: the ${source} is summarised comprehensively; paraphrasing is used
  effectively; all main ideas correctly identified and synthesised concisely
  and coherently; extraneous detail removed.
- 3: summarised adequately; paraphrasing used but not consistently well; main
  ideas identified with minor omissions; ideas connected but not efficiently
  synthesised.
- 2: summarised partially; some main ideas identified, but relies heavily on
  repeating excerpts of the ${source} rather than reformulating.
- 1: disconnected ideas or excerpts without context or synthesis; main ideas
  omitted or misrepresented.
- 0: too limited to assign a higher score; shows no comprehension of the
  ${source}.`;

const OPEN_CONTENT = (what: string, levels: string) => `## Content (0-6)

Judge how fully and accurately the response ${what}, the range and precision
of its language, and how well its ideas connect.

${levels}

Pre-prepared or memorised material that does not deal with this prompt is
irrelevant and scores 0.`;

const JSON_NOTE = `Quote only words that actually appear in the response.`;

const join = (...parts: string[]) => parts.join('\n\n');

/** Read Aloud and Repeat Sentence: Content is counted in code, word by word. */
const READ_REPEAT = join(
  PREAMBLE,
  SPOKEN,
  `Content is scored separately from a transcript. Score ONLY the two traits
below, on how the candidate spoke, not on which words they got right.`,
  PRONUNCIATION,
  ORAL_FLUENCY,
  JSON_NOTE,
);

export const PTE_RUBRICS: Record<string, string> = {
  read_aloud: READ_REPEAT,
  repeat_sentence: READ_REPEAT,

  describe_image: join(
    PREAMBLE,
    SPOKEN,
    OPEN_CONTENT(
      'describes the image',
      `- 6: describes the image fully and accurately and expands on the relationships
  between its features; a listener could build a complete mental picture.
- 5: describes the main features accurately and identifies some relationships;
  minor details missing or misrepresented.
- 4: some accurate simple descriptions and basic relationships, not covering
  every main feature; a basic mental picture.
- 3: mainly superficial descriptions with minor inaccuracies; narrow, repeated
  expressions; elements but not a cohesive whole.
- 2: minimal, superficial descriptions with some inaccuracies; limited
  vocabulary; some elements visualised only with effort.
- 1: disconnected elements or a list of points without description.
- 0: relevant to the prompt but too limited to assign a higher score, or
  unrelated to it.`,
    ),
    PRONUNCIATION,
    ORAL_FLUENCY,
    JSON_NOTE,
  ),

  retell_lecture: join(
    PREAMBLE,
    SPOKEN,
    OPEN_CONTENT(
      'retells the lecture',
      `- 6: clear, accurate, full comprehension; main ideas paraphrased seamlessly and
  important points expanded with specificity; well connected and easy to follow.
- 5: accurately captures main ideas and some important details in own words,
  with minor inconsistencies; generally smooth.
- 4: captures some main ideas and details, possibly with a few inaccuracies or
  a focus on less important details; ideas not well connected.
- 3: captures some ideas, not fully accurately, without separating main points
  from detail; may repeat lecture language without reformulation.
- 2: mostly inaccurate or incomplete, missing main ideas; relies heavily on
  repeating the lecture's language.
- 1: repeats isolated words and phrases from the lecture without meaning.
- 0: related to the lecture but too limited to assign a higher score, or
  unrelated to it.`,
    ),
    PRONUNCIATION,
    ORAL_FLUENCY,
    JSON_NOTE,
  ),

  summarize_group_discussion: join(
    PREAMBLE,
    SPOKEN,
    OPEN_CONTENT(
      "summarises the discussion and each speaker's contribution",
      `- 6: full comprehension; main ideas paraphrased seamlessly with specific detail
  of each speaker's contribution; relationships between points of view
  explored and synthesised effectively.
- 5: main ideas and some important details of different speakers captured
  accurately in own words; some relationships between views noted.
- 4: main ideas and some individual contributions captured, possibly with a few
  inaccuracies; focuses on individual views more than their relationships.
- 3: some ideas captured, not fully accurately; little separation of main points
  from detail; may repeat the discussion's language.
- 2: mostly inaccurate or incomplete, missing main ideas; relies heavily on
  repeating the discussion's language.
- 1: repeats isolated words and phrases without meaning.
- 0: related to the discussion but too limited to assign a higher score, or
  unrelated to it.`,
    ),
    PRONUNCIATION,
    ORAL_FLUENCY,
    JSON_NOTE,
  ),

  respond_to_a_situation: join(
    PREAMBLE,
    SPOKEN,
    OPEN_CONTENT(
      'deals with the situation',
      `- 6: accomplishes the communication goal effectively with full consideration of
  the context; communicates with ease, flexibility and precision; persuasive
  and expands beyond the prompt's language.
- 5: accomplishes the goal adequately with some consideration of the context,
  only minor omissions; clear and accurate with little restriction.
- 4: partially accomplishes the goal with some omissions or misinterpretations;
  adequate, with some limitations and minor inaccuracies.
- 3: partially accomplishes only the most basic aspect of the goal; functional
  but limited; may repeat prompt language without reformulation.
- 2: some relevant content but does not achieve the goal or address the context;
  restrictions and inaccuracies compromise meaning.
- 1: shows a lack of understanding of the situation; significantly restricted;
  repeats isolated words.
- 0: relevant to the prompt but too limited to assign a higher score, or
  unrelated to it.`,
    ),
    PRONUNCIATION,
    ORAL_FLUENCY,
    JSON_NOTE,
  ),

  summarize_written_text: join(
    PREAMBLE,
    WRITTEN,
    SUMMARY_CONTENT('source text'),
    GRAMMAR_SUMMARY,
    VOCABULARY_SUMMARY,
    JSON_NOTE,
  ),

  summarize_spoken_text: join(
    PREAMBLE,
    WRITTEN,
    SUMMARY_CONTENT('recording'),
    GRAMMAR_SUMMARY,
    VOCABULARY_SUMMARY,
    SPELLING,
    JSON_NOTE,
  ),

  write_essay: join(
    PREAMBLE,
    WRITTEN,
    `## Content (0-6)

- 6: fully addresses the prompt in depth, reformulating the issue in own words
  and expanding important points with specificity; convincingly supported.
- 5: adequately addresses the prompt with a persuasive argument; main points
  supported effectively, with minor exceptions.
- 4: addresses the main point; argument generally convincing but lacks depth;
  support inconsistent.
- 3: relevant but does not address the main points adequately; support often
  missing or inappropriate.
- 2: addresses the prompt superficially; largely generic statements or reliance
  on the prompt's language.
- 1: incomplete understanding of the prompt; generic or repetitive phrasing;
  disjointed support.
- 0: does not properly deal with the prompt (including memorised material on
  another topic).`,
    `## Development, structure and coherence (0-6)

- 6: effective logical structure; clear, cohesive argument developed
  systematically; well-developed introduction, conclusion and paragraphs;
  varied connective devices used effectively.
- 5: conventional, appropriate structure, logical if not always smooth;
  introduction, conclusion and logical paragraphs present.
- 4: conventional structure mostly present, some elements missing; argument
  under-developed in places; paragraphs not always effective.
- 3: traces of structure; simple points or disconnected ideas; a position that
  is not developed into a logical argument.
- 2: little recognisable structure; disorganised; only simple connectives.
- 1: disconnected ideas; no clear position; very basic linear connectives.
- 0: no recognisable structure.`,
    `## Grammar (0-2)

- 2: consistent grammatical control of complex language; errors rare and
  difficult to spot.
- 1: relatively high grammatical control; no mistakes that lead to
  misunderstanding.
- 0: mainly simple structures and/or several basic mistakes.`,
    `## General linguistic range (0-6)

- 6: a variety of expressions used with ease and precision; no sign of
  limitation; errors rare and minor.
- 5: expressions varied and appropriate; ideas clear without much restriction;
  occasional errors.
- 4: sufficient range for basic ideas; limitations with complex or abstract
  ideas cause repetition or circumlocution.
- 3: narrow range, simple expressions used repeatedly; restricted to simple
  ideas; errors cause some disruption.
- 2: limited vocabulary and simple expressions dominate; some ideas unclear.
- 1: highly restricted; ideas generally unclear; errors impede meaning.
- 0: meaning is not accessible.`,
    `## Vocabulary range (0-2)

- 2: good command of a broad lexical repertoire, idiomatic expressions and
  colloquialisms.
- 1: good range for general academic topics; lexical shortcomings lead to
  circumlocution or some imprecision.
- 0: mainly basic vocabulary, insufficient for the topic.`,
    SPELLING,
    JSON_NOTE,
  ),
};

/** The rubric a model-graded PTE task is marked against. */
export function pteRubricFor(taskType: string): string {
  const rubric = PTE_RUBRICS[taskType];
  if (!rubric) throw new Error(`No PTE rubric for ${taskType}`);
  return rubric;
}
