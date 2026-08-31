import type { Lesson } from './lesson-types';

/**
 * The lessons. Written, reviewed and versioned here.
 *
 * A lesson without `stages` is planned and not yet written. That state is
 * rendered honestly on the Learn page — a lesson nobody has written is worse
 * than a gap the reader can see, because it wastes the one thing they cannot
 * get back before the exam.
 */
export const LESSONS: readonly Lesson[] = [
  // -------------------------------------------------------------------------
  // Reading
  // -------------------------------------------------------------------------
  {
    id: 'reading-how-it-works',
    module: 'reading',
    group: 'foundations',
    title: 'How IELTS Reading is scored',
    summary:
      'Sixty minutes, forty questions, no extra time to transfer answers. What that actually demands of you.',
    minutes: 8,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Academic Reading gives you three passages and forty questions in sixty minutes. There is no separate transfer time — unlike Listening, whatever is on your answer sheet when the hour ends is what gets marked. That single rule shapes every decision you make in the exam.',
          },
          {
            kind: 'prose',
            body: 'Each question is worth one mark. A question about the third paragraph of Passage 1 is worth exactly as much as the hardest question in Passage 3. Passages get harder as you go, so minutes spent grinding on an early question are borrowed from the questions most likely to separate a 6.5 from a 7.5.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'Raw score, not percentage',
            body: 'Bands come from a fixed conversion table. On Academic Reading, 30 of 40 is around Band 7.0 and 35 is around Band 8.0 — so five marks is a full band. Two careless errors cost more than most candidates assume.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'prose',
            body: 'A working division of the hour looks like this. It is deliberately uneven, because the passages are.',
          },
          {
            kind: 'steps',
            items: [
              'Passage 1 — 15 minutes. Easiest text, so bank the marks and leave early if you can.',
              'Passage 2 — 20 minutes.',
              'Passage 3 — 25 minutes. Densest text and the most abstract questions.',
              'Write answers straight onto the answer sheet as you go. Never leave transferring to the end.',
            ],
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You have eight minutes left and six questions unanswered. What do you do first?',
            answer: 'Put a plausible answer on every blank line.',
            why: 'There is no penalty for a wrong answer, so an unanswered question is a guaranteed zero and a guess is not. Fill every line first, then spend whatever is left improving the guesses.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Sit one full passage under exam timing. The point is not the score — it is finding out where your hour actually goes.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I know all forty questions carry one mark each.',
              'I have a per-passage time budget and I write it down before starting.',
              'I write answers onto the answer sheet as I go, not at the end.',
              'I never leave a line blank.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Timing is a habit, not a technique. Once you have sat three timed passages, look at which passage you consistently overrun — that is the one to attack next.',
          },
        ],
      },
    ],
  },
  {
    id: 'reading-skimming-and-scanning',
    module: 'reading',
    group: 'foundations',
    title: 'Skimming and scanning',
    summary:
      'Two different reading speeds for two different jobs. Most candidates only use one.',
    minutes: 10,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Skimming and scanning are not synonyms for "reading fast". They are two separate operations, done at different moments, for different reasons.',
          },
          {
            kind: 'prose',
            body: 'Skimming builds a map. You read the first and last sentence of each paragraph and note what that paragraph is about — not what it says in detail, just its job in the argument. Sixty to ninety seconds for a whole passage. You come out knowing where things live.',
          },
          {
            kind: 'prose',
            body: 'Scanning finds one thing. You already know what you are looking for — a year, a name, a technical term — and your eye moves down the page hunting that shape while ignoring everything else. You are not reading at all; you are pattern-matching.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'The common mistake',
            body: 'Reading the whole passage carefully before looking at the questions. It feels responsible and it costs you ten minutes you needed for Passage 3. Skim, then let the questions tell you what deserves careful reading.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'C  Early attempts to date the site relied on radiocarbon analysis of charcoal fragments. These returned a range of 8,200 to 7,900 years before present, but the samples were later shown to have been contaminated by younger root material.',
            question: 'What is paragraph C for?',
            answer: 'Dating the site, and why the first dates were unreliable.',
            why: 'That one line is all you need on the first pass. You do not need to remember 8,200 — you need to remember that if a question mentions dating, it lives in C.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'A question asks when a technique was first used commercially. Skim or scan?',
            answer: 'Scan.',
            why: 'You know the shape of the answer — a date. Scanning for numerals finds it in seconds. Skimming would have you reading prose you do not need.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Take any passage. Give yourself ninety seconds to write a five-word summary of each paragraph, then check whether you could locate each question from your notes alone.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I skim before I read the questions, not after.',
              'My skim produces a rough map of what each paragraph does.',
              'When I know the shape of an answer, I scan instead of reading.',
              'I do not read a paragraph closely until a question sends me there.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'If your skim takes more than two minutes, you are still reading. Force yourself to stop at the first and last sentence of each paragraph — the middle is where the detail hides and detail is not what a skim is for.',
          },
        ],
      },
    ],
  },
  {
    id: 'reading-true-false-not-given',
    module: 'reading',
    group: 'question-types',
    title: 'True / False / Not Given',
    summary:
      'The question type that costs most candidates the most marks, and the one rule that fixes it.',
    minutes: 12,
    questionKind: 'true_false_not_given',
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'These questions ask about facts in the passage. Three answers are possible, and each has a precise meaning that has nothing to do with whether the statement is true in the real world.',
          },
          {
            kind: 'steps',
            items: [
              'TRUE — the passage states this, or says something that means the same thing.',
              'FALSE — the passage states the opposite. It actively contradicts the statement.',
              'NOT GIVEN — the passage does not say either way.',
            ],
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'FALSE and NOT GIVEN are not close',
            body: 'FALSE needs a contradiction you can point at. If you cannot underline the words that disagree with the statement, it is NOT GIVEN. Most lost marks here are candidates choosing FALSE because the passage did not confirm something — that is exactly what NOT GIVEN means.',
          },
          {
            kind: 'prose',
            body: 'The other half of the problem is your own knowledge. If you know from elsewhere that a statement is true, that is irrelevant. The only question is what this passage says.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'Urban trees grown in compacted soil showed markedly reduced fungal diversity. Researchers recorded an average of eleven fungal species per sample, compared with twenty-six in woodland controls.',
            question:
              'Statement: Compacted soil reduces the growth rate of urban trees.',
            answer: 'NOT GIVEN',
            why: 'The passage links compacted soil to fungal diversity, not to growth rate. It never says growth is slower — and it never says it is not. Nothing here contradicts the statement, so it cannot be FALSE.',
          },
          {
            kind: 'example',
            source: 'Same extract.',
            question:
              'Statement: Woodland samples contained more fungal species than urban samples.',
            answer: 'TRUE',
            why: 'Twenty-six against eleven. The passage states it in numbers rather than in the statement’s words, which is the normal disguise.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            source:
              'The council has planted over four thousand street trees since 2019. Survival rates in the first three years have not been published.',
            question:
              'Statement: Fewer than half of the trees planted since 2019 survived.',
            answer: 'NOT GIVEN',
            why: 'The passage explicitly says survival rates have not been published — so it cannot confirm or contradict a survival figure. Saying "the passage tells me the data is missing" is not the same as the passage disagreeing.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Drill ten of these in a row. Before you write each answer, say which words in the passage justify it. If you cannot find the words, the answer is NOT GIVEN.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'For every FALSE, I can underline the contradicting words.',
              'I answer from the passage alone, not from what I already know.',
              'I treat "the passage does not confirm it" as NOT GIVEN, not FALSE.',
              'I check whether a qualifier — all, always, only, never — has been added or removed.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Watch your error pattern. If you are wrongly choosing FALSE, you are demanding confirmation the passage never promised. If you are wrongly choosing NOT GIVEN, you are missing paraphrase — the contradiction was there in different words.',
          },
        ],
      },
    ],
  },
  {
    id: 'reading-yes-no-not-given',
    module: 'reading',
    group: 'question-types',
    title: 'Yes / No / Not Given',
    summary:
      'The same three answers, applied to opinions rather than facts. The difference matters.',
    minutes: 8,
    questionKind: 'yes_no_not_given',
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Mechanically this works exactly like True / False / Not Given. What changes is the target: you are matching against the views and claims of the writer or of someone the writer quotes, not against facts.',
          },
          {
            kind: 'steps',
            items: [
              'YES — the writer holds this view.',
              'NO — the writer holds the opposite view.',
              'NOT GIVEN — the writer does not express a view on this.',
            ],
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'Whose opinion?',
            body: 'A passage often reports what other researchers think. If the statement is about the writer’s view and the passage only gives someone else’s, the answer is NOT GIVEN. Read the attribution carefully.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'Proponents of the scheme argue that the cost will be recovered within a decade. This seems optimistic given the maintenance record of comparable systems elsewhere.',
            question:
              'Statement: The writer doubts the cost will be recovered in ten years.',
            answer: 'YES',
            why: '"This seems optimistic" is the writer stepping in with their own judgement. The first sentence is somebody else’s claim; the second is the writer disagreeing with it.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            source:
              'Several economists have described the policy as overdue. Its effects on regional employment remain unmeasured.',
            question: 'Statement: The writer believes the policy was overdue.',
            answer: 'NOT GIVEN',
            why: 'The economists said it. The writer reports that they said it and offers no view of their own. Attribution is the whole question here.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Practise on opinion-heavy passages and mark, for every statement, whose view you are being asked about before you decide the answer.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I identify whose opinion the statement is about before answering.',
              'I look for the writer’s own signals — seems, arguably, unconvincing, rightly.',
              'Reported opinions from others do not count as the writer’s view.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Build a list of the hedging words that mark a writer stepping in. They are the same handful every time, and spotting them turns this question type into a lookup.',
          },
        ],
      },
    ],
  },
  {
    id: 'reading-matching-headings',
    module: 'reading',
    group: 'question-types',
    title: 'Matching headings',
    summary:
      'Paragraph summaries, more headings than paragraphs, and a method that stops you guessing.',
    minutes: 12,
    questionKind: 'matching_headings',
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'You are given one list of headings and asked which fits each paragraph. There are always more headings than paragraphs, so several are distractors, and each heading is used once at most.',
          },
          {
            kind: 'prose',
            body: 'A heading has to cover the whole paragraph, not one striking detail inside it. Distractors are usually built from exactly that: a real phrase from the paragraph, promoted to a summary it cannot support.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Do not start with the headings',
            body: 'Reading the list first plants nine phrasings in your head and you then find them everywhere. Read the paragraph, write your own four-word summary, and only then look for the heading that matches it.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'D  Restoration efforts initially focused on replanting. This proved insufficient: without restoring the fungal networks that connect root systems, saplings failed within two seasons. Attention has since shifted to inoculating soil before planting.',
            question:
              'Choose between "The cost of replanting programmes" and "Why replanting alone did not work".',
            answer: 'Why replanting alone did not work',
            why: 'The paragraph’s job is to explain a failure and the change of approach that followed. Cost is never mentioned — that heading is a distractor built from the topic, not the content.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            source:
              'F  Three cities have now adopted the protocol. Rotterdam reported the largest change, though its baseline measurements were taken in an unusually dry year.',
            question:
              'Choose between "Rotterdam’s exceptional results" and "Early adoption and a caveat".',
            answer: 'Early adoption and a caveat',
            why: 'Rotterdam is one sentence inside a paragraph about adoption across three cities, and the point of naming it is the qualification that follows. A heading built on the striking detail misses what the paragraph is doing.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Do a full set. Write your own summary for every paragraph before you look at the list, and cross off each heading as you use it.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I summarise the paragraph in my own words first.',
              'My heading covers the whole paragraph, not its most memorable sentence.',
              'I cross off headings as I use them.',
              'I leave the hardest paragraph until the others have reduced the list.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Do the paragraphs you are sure about first. Every heading you commit shrinks the pool for the ones you are not, and the last two are usually decidable by elimination alone.',
          },
        ],
      },
    ],
  },
  {
    id: 'reading-sentence-completion',
    module: 'reading',
    group: 'question-types',
    title: 'Sentence completion',
    summary:
      'Words lifted straight from the passage, and the word limit that decides half the marks.',
    minutes: 8,
    questionKind: 'sentence_completion',
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'You complete a sentence with words taken from the passage. The instruction always sets a limit — NO MORE THAN TWO WORDS AND/OR A NUMBER is the usual one — and exceeding it makes a correct answer wrong.',
          },
          {
            kind: 'prose',
            body: 'The words must come from the passage exactly as written. You are not paraphrasing and you are not choosing better vocabulary; you are locating and copying.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Grammar is a free check',
            body: 'Your answer has to fit the sentence grammatically. If the gap needs a plural noun and you have written a singular one, you have found the wrong word — or the right word in the wrong form, which is marked the same way.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'The survey relied on volunteers, who recorded sightings using a standard field notebook supplied by the trust.',
            question:
              'Sentence: Participants logged their observations in a ______ provided by the trust. (TWO WORDS MAXIMUM)',
            answer: 'field notebook',
            why: 'Two words, taken verbatim, and grammatically a singular noun after "a". "Standard field notebook" would be three and would be marked wrong despite being more complete.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            source:
              'Samples were transported in insulated containers to prevent temperature fluctuation during the eight-hour journey.',
            question:
              'Sentence: Specimens were carried in ______ so that the temperature stayed stable. (TWO WORDS MAXIMUM)',
            answer: 'insulated containers',
            why: 'Verbatim from the passage and plural, matching a gap with no article in front of it. The grammar of the gap confirms the choice before you even check the meaning.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Drill a set and count the words in every answer before moving on. Most losses here are limit violations, not comprehension failures.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I have read the word limit and I count every answer against it.',
              'My words are copied from the passage, not paraphrased.',
              'The completed sentence is grammatical.',
              'I have checked singular against plural and verb tense.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Before hunting for the answer, predict what kind of word the gap needs — noun, verb, number. It narrows the search and catches wrong-form answers before you write them.',
          },
        ],
      },
    ],
  },
  {
    id: 'reading-multiple-choice',
    module: 'reading',
    group: 'question-types',
    title: 'Multiple choice',
    summary:
      'Four options, three of them built to look right. How the distractors are made.',
    minutes: 10,
    questionKind: 'multiple_choice',
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'The correct option paraphrases what the passage says. The wrong ones are engineered, and they are engineered in a small number of predictable ways.',
          },
          {
            kind: 'steps',
            items: [
              'True but irrelevant — accurate about the passage, but not an answer to the question asked.',
              'Right words, wrong relationship — uses the passage’s vocabulary but reverses cause and effect, or who said what.',
              'Overstated — the passage says "some" and the option says "all", or "suggests" becomes "proves".',
              'Not in the passage — plausible, sensible, and never actually stated.',
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
              'While mechanised harvesting reduced labour costs, growers reported no measurable improvement in yield.',
            question:
              'Which option is the overstatement: (a) Mechanisation lowered labour costs. (b) Mechanisation proved that yield cannot be improved by machinery.',
            answer: '(b)',
            why: '"No measurable improvement" in one study is not proof that improvement is impossible. Watch for options that convert a single finding into a general law.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            source:
              'Rainfall in the catchment declined by 12% over the period, while abstraction for irrigation rose sharply.',
            question:
              'Why is "Reduced rainfall caused farmers to increase irrigation" wrong?',
            answer: 'It invents a causal link the passage does not make.',
            why: 'Both facts are in the passage and both are true. The passage puts them side by side without claiming one caused the other — this is the right-words-wrong-relationship distractor.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Drill a set, and for every question write one word next to each option you rejected saying why: irrelevant, reversed, overstated, absent.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I find the part of the passage the question refers to before reading the options.',
              'I can say why each rejected option is wrong.',
              'I check quantifiers and certainty words against the passage.',
              'I never pick an option because it sounds sensible.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Answer from the passage before you read the options. If you know what the answer is, the distractors lose most of their power.',
          },
        ],
      },
    ],
  },
  {
    id: 'reading-locating-evidence',
    module: 'reading',
    group: 'advanced',
    title: 'Locating evidence quickly',
    summary:
      'Getting from a question to the sentence that answers it in under twenty seconds.',
    minutes: 10,
  },
  {
    id: 'reading-time-management',
    module: 'reading',
    group: 'advanced',
    title: 'Time management under pressure',
    summary:
      'What to abandon, when to abandon it, and how to recover a passage that is running long.',
    minutes: 10,
  },

  // -------------------------------------------------------------------------
  // Writing
  // -------------------------------------------------------------------------
  {
    id: 'writing-task-2-structure',
    module: 'writing',
    group: 'foundations',
    title: 'Structuring a Task 2 essay',
    summary:
      'Forty minutes, 250 words, four paragraphs. Why the shape is not negotiable.',
    minutes: 12,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Task 2 is worth twice Task 1 and is marked on four criteria of equal weight: Task Response, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy. Two of those four are about organisation and clarity, which means structure is not presentation — it is half the mark.',
          },
          {
            kind: 'steps',
            items: [
              'Introduction — rephrase the question and state your position in one sentence.',
              'Body paragraph 1 — one idea, developed.',
              'Body paragraph 2 — a second idea, developed.',
              'Conclusion — restate the position. No new arguments.',
            ],
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'Two developed ideas beat four mentioned ones',
            body: 'Task Response rewards ideas that are explained and supported. A body paragraph that introduces three points and develops none scores lower than one that takes a single point seriously.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'Question: Some people believe governments should fund public transport rather than road building. To what extent do you agree?',
            question: 'What does a Band 7 introduction look like?',
            answer:
              'It rephrases the question in the writer’s own words and commits to a clear position in one sentence — no list of what the essay will cover.',
            why: 'The examiner needs to know your position before the body starts. An introduction that announces "this essay will discuss both sides" without taking a side loses Task Response marks immediately.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You have written three body paragraphs and are at 310 words with five minutes left. What is the risk?',
            answer: 'Under-developed paragraphs and no time to check.',
            why: 'Three body paragraphs in 40 minutes almost always means three shallow ones. Two developed paragraphs plus four minutes of checking scores better on every criterion.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Write one Task 2 essay under full timing. Spend the first five minutes planning two ideas and nothing else.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'My introduction states a position, not a plan.',
              'Each body paragraph carries exactly one idea.',
              'My conclusion introduces nothing new.',
              'I am over 250 words and under about 300.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'If you routinely run out of time, the fix is almost never writing faster. It is planning two ideas in five minutes instead of discovering them as you write.',
          },
        ],
      },
    ],
  },
  {
    id: 'writing-developing-arguments',
    module: 'writing',
    group: 'question-types',
    title: 'Developing an argument',
    summary:
      'The single most common reason a Band 6 essay is not a Band 7: claims that arrive without support.',
    minutes: 14,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Most candidates who plateau at Band 6 have relevant ideas and correct grammar. What they do not have is development: their paragraphs assert something and move on.',
          },
          {
            kind: 'prose',
            body: 'A developed paragraph follows a shape. Make the claim, explain the mechanism, give a concrete instance, then connect it back to the question. Every sentence has a job, and if a sentence has no job it is padding.',
          },
          {
            kind: 'steps',
            items: [
              'Claim — the point of this paragraph, in one sentence.',
              'Explanation — why it is true. This is the sentence most candidates skip.',
              'Example — something specific. It does not need to be a statistic.',
              'Link — how this answers the question that was asked.',
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
              'Governments should invest more in public transport. Many cities have serious traffic problems and pollution is increasing every year.',
            question: 'Why is this Band 6 rather than Band 7?',
            answer: 'It states a claim and then states two more claims.',
            why: 'Nothing explains how investment in transport addresses traffic or pollution. The reader is asked to accept a connection the writer never makes. Adding one sentence — "when a reliable alternative exists, commuters who would otherwise drive have a reason not to" — is the difference.',
          },
          {
            kind: 'example',
            source:
              'Governments should invest more in public transport. When a network is frequent and reliable, driving stops being the only practical option for daily commuting, and the number of private cars entering city centres falls. Vienna’s expansion of its tram network was followed by a measurable drop in car journeys into the inner districts. Investment therefore addresses congestion at its source rather than managing its symptoms.',
            question: 'What changed?',
            answer: 'Claim, explanation, example, link — in that order.',
            why: 'The same idea, the same length band, but the reader is never asked to fill a gap themselves. That is what Task Response is measuring.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            source: 'Online learning is beneficial because it is flexible.',
            question: 'Which part is missing?',
            answer: 'The explanation, and the example.',
            why: 'Flexibility is asserted as a benefit but never unpacked — flexible for whom, and why does that produce a better outcome? A claim plus a label is not an argument.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Write one body paragraph only, in fifteen minutes, and label each sentence claim, explanation, example or link. Any sentence you cannot label is padding.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'Every claim is followed by a sentence explaining why it holds.',
              'Each body paragraph contains at least one concrete instance.',
              'The last sentence connects back to the question.',
              'No sentence exists only to fill space.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Take an essay you have already written and mark every sentence with its job. The pattern in what is missing will be the same across all your essays, and it is the thing to fix.',
          },
        ],
      },
    ],
  },
  {
    id: 'writing-lexical-resource',
    module: 'writing',
    group: 'question-types',
    title: 'Lexical resource without a thesaurus',
    summary:
      'Precision scores. Reaching for an unfamiliar synonym costs more than repeating a word.',
    minutes: 10,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Lexical Resource measures range and accuracy together. A word used slightly wrongly damages the score more than a plain word used correctly, because it makes the meaning harder to follow.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'The thesaurus trap',
            body: 'Swapping "important" for "paramount" in every sentence does not read as range; it reads as a candidate who has memorised a list. Collocation — which words genuinely go together — is what separates Band 6 vocabulary from Band 7.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              '"Governments must ameliorate the quantity of pollution in metropolitan areas."',
            question: 'What went wrong?',
            answer: 'Two words are close to right and both are wrong.',
            why: 'You ameliorate a situation, not a quantity, and pollution is reduced rather than ameliorated. "Governments must reduce pollution in cities" is plainer and scores better because it is correct.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You have used "increase" four times. Should you replace them all?',
            answer: 'No — replace the ones where a more precise word exists.',
            why: 'Costs rise, numbers grow, pressure mounts. Vary where the precise word is genuinely different; repeating "increase" correctly is better than three near-misses.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Write an essay and afterwards mark every word you were not fully confident about. Look each one up. That list is your actual vocabulary gap.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I use words I am sure of rather than words I am guessing at.',
              'I vary vocabulary where precision improves, not for its own sake.',
              'I have checked that my word pairings are ones people actually use.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Collect vocabulary in phrases, not single words. "A sharp decline in", "poses a serious threat to" — phrases carry their own collocation and cannot be misused the same way.',
          },
        ],
      },
    ],
  },
  {
    id: 'writing-task-1-academic',
    module: 'writing',
    group: 'advanced',
    title: 'Academic Task 1: describing data',
    summary:
      'Selecting the key features of a chart instead of listing every number on it.',
    minutes: 12,
  },
];

const BY_ID = new Map(LESSONS.map((l) => [l.id, l]));

export function getLesson(id: string) {
  return BY_ID.get(id) ?? null;
}

export function lessonsForModule(module: string) {
  return LESSONS.filter((l) => l.module === module);
}

/** Written lessons only — the ones a plan may legitimately send someone to. */
export const LESSON_FOR_KIND: Readonly<Record<string, string>> =
  Object.fromEntries(
    LESSONS.filter((l) => l.questionKind && l.stages).map((l) => [
      l.questionKind!,
      l.id,
    ]),
  );
