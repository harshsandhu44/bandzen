import type { LessonSeed } from './types';

/**
 * Reading: 10 lessons, beginner to expert. 3 foundations, 5 question-types
 * (one per question kind), 2 advanced. Plain, short sentences throughout.
 */
export const READING_LESSONS: LessonSeed[] = [
  {
    slug: 'reading-scoring-basics',
    module: 'reading',
    group: 'foundations',
    title: 'How IELTS Reading works',
    summary:
      'Three passages, forty questions, sixty minutes. Learn the shape of the test before you learn how to beat it.',
    minutes: 6,
    questionKind: null,
    orderIndex: 0,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'IELTS Reading has three passages. There are forty questions in total. You have sixty minutes, and no extra time to copy answers onto a sheet.',
          },
          {
            kind: 'prose',
            body: 'Every question is worth one point. A hard question and an easy question score the same. So an easy question is never worth skipping.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'The passages get harder',
            body: 'Passage 1 is the easiest. Passage 3 is the hardest. Spend less time on Passage 1 so you have more time for Passage 3.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Passage 1: about 15 minutes.',
              'Passage 2: about 20 minutes.',
              'Passage 3: about 25 minutes.',
              'Write every answer on the answer sheet as you go.',
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
              'You have 5 minutes left and 4 questions with no answer. What do you do?',
            answer: 'Write a guess for every question.',
            why: 'A blank answer always scores zero. A guess might be right. There is no penalty for a wrong guess.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Go and try one full passage with a timer. Do not worry about your score yet. Just see where your time goes.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I know there are 3 passages and 40 questions.',
              'I know every question is worth the same one point.',
              'I have a time plan for each passage.',
              'I never leave a question blank.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'After your first timed practice, check which passage took too long. That is the one to practise next.',
          },
        ],
      },
    ],
  },
  {
    slug: 'reading-skimming-scanning-basics',
    module: 'reading',
    group: 'foundations',
    title: 'Skimming and scanning',
    summary:
      'Two fast ways to read: skimming for the general idea, and scanning for one exact fact.',
    minutes: 8,
    questionKind: null,
    orderIndex: 1,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'You do not have time to read every word of every passage. You need two faster skills.',
          },
          {
            kind: 'prose',
            body: 'Skimming means reading fast to get the main idea. Scanning means searching fast for one exact word or number.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'By 1850, most towns still kept their own local time. This changed when railways needed one shared clock for every station.',
            question: 'What is this paragraph mainly about?',
            answer: 'Railways forced towns to share one clock.',
            why: 'The first sentence gives the old situation. The second sentence gives the change. Together they are the whole idea.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            source:
              'The study followed 4,200 workers over twelve years, starting in 2003.',
            question: 'You need the year the study started. What do you scan for?',
            answer: 'A number that looks like a year, near the word "started".',
            why: 'Scanning for numbers and dates is much faster than reading the whole sentence for meaning.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Pick any passage. Give yourself 90 seconds to skim it. Then write one sentence saying what it is about.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I can explain the difference between skimming and scanning.',
              'I skim first sentences and last sentences of paragraphs.',
              'I scan for numbers, names, and dates when I need one fact.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Practise skimming with anything you read this week — a news article, an email. Speed comes from repetition, not from one lesson.',
          },
        ],
      },
    ],
  },
  {
    slug: 'reading-question-carefully',
    module: 'reading',
    group: 'foundations',
    title: 'Reading the question carefully',
    summary:
      'Most wrong answers come from misreading the question, not from misunderstanding the passage.',
    minutes: 7,
    questionKind: null,
    orderIndex: 2,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'A question can look simple and still trick you. One small word can change what is actually being asked.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Watch small words',
            body: 'Words like "only", "always", "most", and "not" change the meaning of a question completely.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: 'Question: "Which factor was the ONLY cause of the delay?"',
            question: 'What word makes this question harder than it looks?',
            answer: '"Only" — you must rule out every other possible cause.',
            why: 'If the passage gives two causes, "only" makes the question about one specific cause false or not given.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You read a question fast and answer it in 10 seconds. Is that safe?',
            answer: 'No. Read the question twice before you search the passage.',
            why: 'A ten-second read misses small words. A ten-second mistake costs the same one point as a hard question you get wrong.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Before your next practice set, underline one key word in every question before you read the passage.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I read every question twice.',
              'I underline small words that limit the answer.',
              'I do not answer from memory of the passage — I check the exact line.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'When you get an answer wrong in practice, check if you misread the question. This is the most common and easiest mistake to fix.',
          },
        ],
      },
    ],
  },
  {
    slug: 'reading-true-false-not-given-simple',
    module: 'reading',
    group: 'question-types',
    title: 'True / False / Not Given',
    summary:
      'The three answers mean three different things. Mixing up "False" and "Not Given" is the most common mistake.',
    minutes: 9,
    questionKind: 'true_false_not_given',
    orderIndex: 0,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'True means the statement matches the passage. False means the passage says the opposite. Not Given means the passage does not mention it at all.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'False is not the same as Not Given',
            body: 'False means the information IS there, but it says the opposite. Not Given means the information is missing.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: 'The bridge was completed in 1932, two years behind schedule.',
            question: 'Statement: "The bridge was finished on time."',
            answer: 'False.',
            why: 'The passage says it was two years late. This is the opposite of "on time", so it is False, not Not Given.',
          },
          {
            kind: 'example',
            source: 'The bridge was completed in 1932, two years behind schedule.',
            question: 'Statement: "The bridge cost more than planned."',
            answer: 'Not Given.',
            why: 'The passage never mentions cost. We cannot say True or False about something the text does not talk about.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            source: 'Every member of staff attended the training session.',
            question:
              'Statement: "Most staff attended the training." True, False, or Not Given?',
            answer: 'True.',
            why: '"Every member" includes "most". If all attended, then most did too.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Try a full set of True / False / Not Given questions. For each answer, point to the exact line that gave you that answer.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I can explain the difference between False and Not Given in my own words.',
              'I find the exact sentence before I choose an answer.',
              'I do not use outside knowledge — only what the passage says.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'If you keep choosing Not Given when the answer is False, you are probably missing an opposite word like "not", "never", or "no longer". Read more slowly around negatives.',
          },
        ],
      },
    ],
  },
  {
    slug: 'reading-yes-no-not-given-simple',
    module: 'reading',
    group: 'question-types',
    title: 'Yes / No / Not Given',
    summary:
      'Same idea as True / False / Not Given, but about the writer’s opinion, not plain facts.',
    minutes: 9,
    questionKind: 'yes_no_not_given',
    orderIndex: 1,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Yes / No / Not Given questions are about opinions and claims, not facts. Ask yourself: does the writer agree with this statement?',
          },
          {
            kind: 'prose',
            body: 'Yes means the writer agrees. No means the writer disagrees. Not Given means the writer never says either way.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'Critics claim the policy will fail, but the evidence so far suggests otherwise.',
            question: 'Statement: "The writer believes the policy will succeed."',
            answer: 'Yes.',
            why: 'The writer disagrees with the critics ("otherwise" means the opposite of failing), so the writer leans toward success.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            source:
              'The new policy is expensive, though its long-term effect remains unclear.',
            question:
              'Statement: "The writer thinks the policy is worth the cost." Yes, No, or Not Given?',
            answer: 'Not Given.',
            why: 'The writer says the cost is high and the effect is unclear, but never actually says whether it is worth it.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Find a passage with the writer’s opinion in it. Practise separating what the writer believes from what other people in the text believe.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I only look for the writer’s opinion, not other people quoted in the text.',
              'I know Not Given means the opinion is simply never stated.',
              'I do not guess the writer’s opinion from my own opinion.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Passages sometimes quote other people’s opinions to argue against them. Always check whose opinion the sentence actually belongs to.',
          },
        ],
      },
    ],
  },
  {
    slug: 'reading-multiple-choice-simple',
    module: 'reading',
    group: 'question-types',
    title: 'Multiple choice',
    summary:
      'Wrong options are built to look almost right. Learn to spot the small detail that breaks them.',
    minutes: 8,
    questionKind: 'multiple_choice',
    orderIndex: 2,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'In multiple choice, one option is fully correct. The other options are usually close, but wrong in one small way.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'Read all options first',
            body: 'Do not pick the first option that sounds correct. Read all of them, then compare.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'The trial included 300 participants, all of whom had used the drug for over a year.',
            question:
              'A) 300 people took part. B) Over 300 people took part. C) 300 people took part for under a year.',
            answer: 'A.',
            why: 'B is wrong because it says "over 300", not exactly 300. C is wrong because it says "under a year", the opposite of the text.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            source: 'Sales rose in every region except the north, where they were flat.',
            question:
              'Which is true? A) Sales rose everywhere. B) Sales fell in the north. C) Sales stayed the same in the north.',
            answer: 'C.',
            why: '"Flat" means unchanged, which matches C. A is wrong because of the word "except". B is wrong because flat is not the same as falling.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Try a multiple choice set. For each wrong option, write in one sentence exactly why it is wrong.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I read all options before choosing.',
              'I can explain why the wrong options are wrong, not just why the right one is right.',
              'I watch for numbers, dates, and words like "except" and "only".',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'If two options both look correct, go back to the passage and read that exact sentence again, word by word.',
          },
        ],
      },
    ],
  },
  {
    slug: 'reading-matching-headings-simple',
    module: 'reading',
    group: 'question-types',
    title: 'Matching headings',
    summary:
      'A heading matches the whole idea of a paragraph, not just one word that appears in it.',
    minutes: 9,
    questionKind: 'matching_headings',
    orderIndex: 3,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'You are given more headings than paragraphs. Each paragraph gets one heading. A heading is the "title" for the paragraph’s main idea.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Do not match by keyword',
            body: 'A wrong heading often repeats a word from the paragraph. The right heading matches the meaning, not the exact word.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'Paragraph: Early factories relied on rivers for power. As steam engines improved, factories no longer needed to be built next to water.',
            question:
              'Which heading fits: "The history of rivers" or "How steam freed factories from rivers"?',
            answer: '"How steam freed factories from rivers."',
            why: 'The first heading only repeats the word "rivers". The second describes the actual change the paragraph explains.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'A paragraph explains three different theories about a topic, without picking one. What kind of heading fits?',
            answer:
              'Something like "Competing explanations" or "Different views on the topic" — not the name of just one theory.',
            why: 'A heading for a paragraph with several ideas must cover all of them, not just the first one mentioned.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Read one paragraph at a time. Before looking at the heading list, write your own one-line heading. Then find the closest match.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I summarise the paragraph in my own words before checking the headings.',
              'I ignore headings that only repeat one keyword.',
              'I use each heading only once, and cross it off once used.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'This is the hardest question type for most candidates. Do not rush it — a slower, careful read here often saves time later.',
          },
        ],
      },
    ],
  },
  {
    slug: 'reading-sentence-completion-simple',
    module: 'reading',
    group: 'question-types',
    title: 'Sentence completion',
    summary:
      'The missing word must fit the grammar of the sentence and stay under the word limit.',
    minutes: 8,
    questionKind: 'sentence_completion',
    orderIndex: 4,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'You fill a gap in a sentence using words from the passage. The instructions always give a word limit, like "no more than two words".',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Follow the word limit exactly',
            body: 'If the limit is "two words" and you write three, the answer is marked wrong, even if the meaning is correct.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: 'The bridge was built using a new type of reinforced concrete.',
            question:
              'Complete: "The bridge used a new form of ___ (no more than two words)."',
            answer: 'reinforced concrete',
            why: 'The words come directly from the passage. "A new form of" matches "a new type of" in the text.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            source: 'Applicants must submit their forms by Friday at the latest.',
            question:
              'Complete: "Forms must be sent no later than ___" — what goes in the gap?',
            answer: 'Friday',
            why: 'Check the sentence still makes grammatical sense: "no later than Friday" reads correctly.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Try a sentence completion set. After each answer, count your words to be sure you followed the limit.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I check the word limit before I start.',
              'I use words from the passage, not my own rewording, unless told otherwise.',
              'I check my finished sentence makes grammatical sense.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Spelling counts. Copy the exact spelling from the passage rather than typing from memory.',
          },
        ],
      },
    ],
  },
  {
    slug: 'reading-vocabulary-paraphrasing',
    module: 'reading',
    group: 'advanced',
    title: 'Tricky vocabulary and paraphrasing',
    summary:
      'Questions rarely use the same words as the passage. Learn to recognise the same idea in different words.',
    minutes: 10,
    questionKind: null,
    orderIndex: 0,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'IELTS Reading tests whether you understand meaning, not whether you can match identical words. A question almost never repeats the passage word for word.',
          },
          {
            kind: 'prose',
            body: 'This is called paraphrasing: saying the same thing with different words. Learning to spot it is one of the highest-value skills for a high score.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: 'The number of visitors declined sharply after the new fee was introduced.',
            question: 'Question wording: "Visitor numbers fell quickly once charges began."',
            answer: 'These are the same fact, in different words.',
            why: '"Declined sharply" = "fell quickly". "New fee" = "charges began". Same meaning, no shared words.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'The passage says "researchers were unable to reach a firm conclusion." A question says "the results were inconclusive." Do these match?',
            answer: 'Yes.',
            why: '"Unable to reach a firm conclusion" and "inconclusive" both mean the same thing: no clear answer was found.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Pick five sentences from any passage. For each one, write the same idea using completely different words. This builds your paraphrasing instinct fast.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I expect questions to reword the passage, not copy it.',
              'I look for matching meaning, not matching words.',
              'I know common swaps: rise/increase, fall/decline, big/significant.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Build a personal list of paraphrase pairs you meet in practice. Reviewing this list before the exam sharpens this skill quickly.',
          },
        ],
      },
    ],
  },
  {
    slug: 'reading-time-pressure-strategy',
    module: 'reading',
    group: 'advanced',
    title: 'Full-passage time pressure',
    summary:
      'A plan for the exact moment you feel behind schedule, so panic never costs you more points.',
    minutes: 9,
    questionKind: null,
    orderIndex: 1,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Even strong readers run out of time. What matters is having a plan for that moment, instead of panicking.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'A rushed guess beats a blank answer',
            body: 'Every question is worth one point whether it took you ten seconds or two minutes. Never trade a whole question for perfection on one line.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Check the clock every ten minutes, not just at the end.',
              'If a passage is running long, skip a hard question and mark it.',
              'Answer every easy question in the passage first.',
              'Return to marked questions only if time remains.',
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
              'You are stuck on one question for over two minutes. What should you do?',
            answer: 'Make your best guess, mark it, and move on.',
            why: 'Two minutes on one point is expensive. The next three questions might take thirty seconds each and be easier.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Do a full timed mock test. Practise the skip-and-return method on purpose, even on questions you could solve if given more time.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I check the time regularly during the test, not only at the end.',
              'I can skip a hard question without losing my calm.',
              'I never leave the exam with a blank answer.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Timing is a habit built over many practice tests, not a trick learned in one sitting. Track your finishing time every time you practise.',
          },
        ],
      },
    ],
  },
];
