import type { LessonSeed } from './types';

/**
 * Writing: 10 lessons, beginner to expert. 3 foundations, 4 question-types
 * (task-shaped skills), 3 advanced.
 */
export const WRITING_LESSONS: LessonSeed[] = [
  {
    slug: 'writing-scoring-basics',
    module: 'writing',
    group: 'foundations',
    title: 'How IELTS Writing works',
    summary:
      'Two tasks, one hour. Task 2 is worth more, so it needs more of your time.',
    minutes: 6,
    questionKind: null,
    orderIndex: 0,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'IELTS Writing has two tasks in sixty minutes. Task 1 asks you to describe something. Task 2 asks you to write an essay.',
          },
          {
            kind: 'prose',
            body: 'Task 2 counts for more of your final score than Task 1. This means Task 2 deserves more of your time.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'Recommended timing',
            body: 'Spend about 20 minutes on Task 1 and about 40 minutes on Task 2.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Academic Task 1: describe a chart, graph, or diagram.',
              'General Task 1: write a letter.',
              'Task 2 (both versions): write a full essay, at least 250 words.',
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
              'You have 25 minutes left and have not started Task 2. What do you do?',
            answer: 'Move to Task 2 immediately, even if Task 1 is not perfect.',
            why: 'Task 2 is worth more marks. A short, unfinished Task 1 costs less than a missing Task 2.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Time yourself writing one Task 1 in 20 minutes. Do not aim for perfect — aim for finished.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I know Task 2 is worth more than Task 1.',
              'I have a rough time budget for each task.',
              'I know the minimum word count for each task (150 for Task 1, 250 for Task 2).',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'If you always run out of time on Task 2, practise Task 1 under a strict 20-minute limit until it becomes automatic.',
          },
        ],
      },
    ],
  },
  {
    slug: 'writing-planning-before-you-write',
    module: 'writing',
    group: 'foundations',
    title: 'Planning before you write',
    summary:
      'Two minutes of planning saves you from a confusing essay and wasted words.',
    minutes: 7,
    questionKind: null,
    orderIndex: 1,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Writing without a plan often leads to repeating yourself or running out of ideas halfway through.',
          },
          {
            kind: 'prose',
            body: 'A short plan before you write saves time overall, even though it feels slower at first.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Read the question twice.',
              'Decide your main opinion or main point in one sentence.',
              'Write two or three supporting ideas as single words or short phrases.',
              'Only then start writing full sentences.',
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
              'You have a strong idea for your first paragraph but no plan for the rest. Should you start writing?',
            answer: 'No — plan the whole essay first, even briefly.',
            why: 'Without a plan, the first paragraph can use up ideas you needed for later paragraphs, leaving you stuck.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Take one essay question and spend exactly three minutes planning it. Write only short notes, not full sentences.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I write a short plan before every essay.',
              'My plan has a clear main point and supporting ideas.',
              'I spend under five minutes planning, so I still have time to write.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'If your plans take too long, practise writing them in single words instead of phrases. The plan is only for you.',
          },
        ],
      },
    ],
  },
  {
    slug: 'writing-task-2-essay-shape',
    module: 'writing',
    group: 'foundations',
    title: 'Structuring a Task 2 essay',
    summary:
      'A clear shape — introduction, two body paragraphs, conclusion — makes your essay easy for the examiner to follow.',
    minutes: 8,
    questionKind: null,
    orderIndex: 2,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'A Task 2 essay usually has four parts: an introduction, two body paragraphs, and a conclusion.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'One idea per paragraph',
            body: 'Each body paragraph should argue one main idea. Mixing two ideas in one paragraph makes the essay harder to follow.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Introduction: restate the question in your own words, then give your main position.',
              'Body paragraph 1: your first main idea, with one example.',
              'Body paragraph 2: your second main idea, with one example.',
              'Conclusion: a short summary of your position. No new ideas here.',
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
              'Your conclusion introduces a brand new argument you have not mentioned before. Is this a good idea?',
            answer: 'No.',
            why: 'A conclusion should summarise what you already said. A new idea here looks unplanned and can confuse the reader.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Take an old essay you wrote. Label each paragraph: introduction, body 1, body 2, or conclusion. Check that each one does its job.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'My essay has four clear paragraphs.',
              'Each body paragraph has one main idea, not two.',
              'My conclusion only summarises — it adds nothing new.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Once this shape feels automatic, practise adjusting it slightly for essay types that ask for more than one opinion, like "discuss both views".',
          },
        ],
      },
    ],
  },
  {
    slug: 'writing-describing-charts',
    module: 'writing',
    group: 'question-types',
    title: 'Describing charts (Academic Task 1)',
    summary:
      'Report the biggest patterns in the data. You are not explaining why the numbers changed.',
    minutes: 9,
    questionKind: null,
    orderIndex: 0,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Academic Task 1 gives you a chart, graph, or diagram. Your job is to describe what it shows, not to guess why it happened.',
          },
          {
            kind: 'prose',
            body: 'You cannot describe every number. Focus on the biggest changes, the highest and lowest points, and any clear pattern.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'Chart data: coffee sales rose from 10,000 units in 2015 to 45,000 units in 2020, while tea sales stayed flat at around 20,000 units.',
            question: 'What is the single most important sentence to write first?',
            answer: 'Coffee sales rose sharply while tea sales stayed roughly the same.',
            why: 'This one sentence captures the overall pattern. Specific numbers can support it afterward, but the pattern comes first.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'The data shows five different products. Should you write one sentence about each of the five?',
            answer:
              'No — group similar ones together and focus on the biggest differences.',
            why: 'Task 1 rewards a clear overview, not a full list. Grouping shows you can identify the real pattern.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Find any simple chart online. Write two sentences: one giving the overall pattern, one giving one specific supporting number.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'My first paragraph gives the overall pattern, not a list of numbers.',
              'I do not guess reasons for the trend — only IELTS General letters explain reasons.',
              'I group similar data instead of describing every single point.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Practise on different chart types — bar charts, line graphs, pie charts, and diagrams — since each needs slightly different language.',
          },
        ],
      },
    ],
  },
  {
    slug: 'writing-a-letter',
    module: 'writing',
    group: 'question-types',
    title: 'Writing a letter (General Task 1)',
    summary:
      'The right tone matters as much as the content — formal, semi-formal, or informal, depending on who you are writing to.',
    minutes: 8,
    questionKind: null,
    orderIndex: 1,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'General Task 1 asks you to write a letter. The task tells you who you are writing to — a stranger, a colleague, or a friend.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'Match the tone to the reader',
            body: 'A letter to a company is formal. A letter to a friend is informal. Using the wrong tone loses marks even if the content is good.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: 'Task: write to your landlord about a broken heater.',
            question: 'Should this letter be formal or informal?',
            answer: 'Formal.',
            why: 'A landlord is not a personal friend. Use "Dear Sir or Madam" or the landlord’s surname, and avoid casual language.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You are asked to write to a close friend about a delayed trip. Which greeting fits — "Dear Sir" or "Hi Sam"?',
            answer: '"Hi Sam."',
            why: 'A close friend calls for an informal, friendly tone throughout the whole letter.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Write the opening two sentences for a letter to a hotel manager complaining about noise, and then rewrite the same two sentences as if to a friend.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I check who the letter is for before I start writing.',
              'My greeting matches the tone (formal, semi-formal, or informal).',
              'I cover all three bullet points the task usually gives.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Build a small list of set phrases for each tone — formal openings, informal closings — so you are not inventing them under time pressure.',
          },
        ],
      },
    ],
  },
  {
    slug: 'writing-building-an-argument',
    module: 'writing',
    group: 'question-types',
    title: 'Building an argument',
    summary:
      'A strong point needs a reason and an example — not just a bold claim.',
    minutes: 9,
    questionKind: null,
    orderIndex: 2,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'A claim alone is weak. "Social media is harmful" is just an opinion. You need to say why, and give an example.',
          },
          {
            kind: 'prose',
            body: 'A simple pattern works well: Point, then Reason, then Example.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: '"Social media can harm mental health."',
            question: 'How would you add a reason and an example to this point?',
            answer:
              '"Social media can harm mental health, because constant comparison to others can lower self-esteem. For example, studies link heavy Instagram use among teenagers to higher rates of anxiety."',
            why: 'The reason explains why the point is true. The example makes it concrete and believable, not just a general claim.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'Your paragraph only has a point and a reason, with no example. Is that a complete paragraph?',
            answer: 'It is weaker without one, but not automatically wrong.',
            why: 'An example makes an argument more convincing and specific. Without it, the point can feel vague or unsupported.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Take one opinion you have about any topic. Write it as Point, Reason, Example in three separate sentences.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'Every body paragraph has a clear point.',
              'Every point has a reason explaining why it is true.',
              'Every point has an example, even a short, invented one.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'If you cannot think of a real example fast, a realistic invented one is fine. The examiner checks your English, not your facts.',
          },
        ],
      },
    ],
  },
  {
    slug: 'writing-linking-words-naturally',
    module: 'writing',
    group: 'question-types',
    title: 'Linking words naturally',
    summary:
      'Linking words connect your ideas. Using too many, or the wrong ones, makes writing sound stiff.',
    minutes: 8,
    questionKind: null,
    orderIndex: 3,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Linking words like "however", "in addition", and "therefore" show how your ideas connect.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Do not overuse them',
            body: 'Starting every sentence with "Furthermore" or "Moreover" sounds unnatural. One clear link per paragraph is often enough.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              '"The plan will reduce traffic. Furthermore, additionally, it will also lower pollution levels too."',
            question: 'What is wrong with this sentence?',
            answer: 'It uses three linking words with the same meaning in one sentence.',
            why: '"Furthermore", "additionally", and "also" all mean "in addition". Using all three is repetitive, not impressive.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You want to show a contrast between two ideas. Which fits better: "and" or "however"?',
            answer: '"However."',
            why: '"And" joins similar ideas. "However" signals that the second idea contrasts with the first.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Take a paragraph you wrote before. Circle every linking word. Remove any that repeat the same meaning.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I use one clear linking word per idea, not several with the same meaning.',
              'I know at least one word each for addition, contrast, and result.',
              'My linking words match the relationship between the ideas.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Read your essay aloud. If a linking word sounds forced when spoken, it probably reads the same way to the examiner.',
          },
        ],
      },
    ],
  },
  {
    slug: 'writing-vocabulary-without-thesaurus',
    module: 'writing',
    group: 'advanced',
    title: 'Vocabulary without a thesaurus',
    summary:
      'Using rare words incorrectly scores lower than using simple words correctly.',
    minutes: 9,
    questionKind: null,
    orderIndex: 0,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Some candidates swap simple words for rare ones from a thesaurus, hoping to sound advanced. This often backfires.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Wrong word choice hurts your score',
            body: 'A rare word used in the wrong context is worse than a simple word used correctly. Examiners notice unnatural word choice.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: '"The government should augment the budget for schools."',
            question: 'Is "augment" a natural word choice here?',
            answer: 'It is a little unusual — "increase" is more natural and just as correct.',
            why: '"Augment" is a real word but sounds formal in an odd way here. Natural, correct language scores better than forced, fancy language.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You know a rare word but are not fully sure of its meaning. Should you use it in your essay?',
            answer: 'No — use a simpler word you are certain about.',
            why: 'A misused word signals weaker vocabulary control, even if the intention was to sound advanced.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Take five simple words you use often, like "big", "good", "bad". Find one natural, correct alternative for each — not the rarest word you can find.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I only use words whose exact meaning I am sure of.',
              'I avoid swapping simple words for rare ones just to sound impressive.',
              'I vary my vocabulary a little, without forcing unnatural words in.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Learn new words by reading, not just from lists. Words learned in context are far easier to use correctly.',
          },
        ],
      },
    ],
  },
  {
    slug: 'writing-common-grammar-mistakes',
    module: 'writing',
    group: 'advanced',
    title: 'Common grammar mistakes',
    summary:
      'A few grammar errors repeat across almost every candidate. Fixing these has a big effect on your score.',
    minutes: 9,
    questionKind: null,
    orderIndex: 1,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Most grammar mistakes fall into a few common patterns: subject-verb agreement, wrong tense, and missing articles ("a", "an", "the").',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: '"The number of students have increased this year."',
            question: 'What is the grammar mistake here?',
            answer: '"Have" should be "has".',
            why: '"The number of students" is singular (it is "the number" that is the subject), so it needs a singular verb, "has".',
          },
          {
            kind: 'example',
            source: '"Government should invest more in education."',
            question: 'What is missing from this sentence?',
            answer: '"The" before "government".',
            why: 'In general statements about a country\'s government, English usually needs the article "the": "The government".',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You are unsure whether to write "informations" or "information". Which is correct?',
            answer: '"Information."',
            why: '"Information" is an uncountable noun in English. It has no plural form with an "s".',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Take an old essay and check every sentence for subject-verb agreement and missing articles. Mark anything you are unsure about.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I check that singular subjects use singular verbs.',
              'I check for missing "a", "an", or "the" where needed.',
              'I avoid adding "-s" to uncountable nouns like "information" and "advice".',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Keep a personal list of mistakes you repeat. Most candidates make the same three or four errors again and again — find yours.',
          },
        ],
      },
    ],
  },
  {
    slug: 'writing-fast-final-checks',
    module: 'writing',
    group: 'advanced',
    title: 'Polishing and checking your work fast',
    summary:
      'With two minutes left, check for the mistakes most likely to cost you marks — not every possible error.',
    minutes: 7,
    questionKind: null,
    orderIndex: 2,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'You will rarely have time for a full, slow proofread. You need a fast checklist for the last few minutes.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Check the word count — did you meet the minimum?',
              'Check you answered every part of the question.',
              'Scan for repeated words you could vary.',
              'Check the first word of each sentence starts with a capital letter.',
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
              'You have two minutes left. Should you reread the whole essay carefully?',
            answer: 'No — use the short checklist instead of a full reread.',
            why: 'A full careful reread takes too long. A fast, targeted checklist catches the highest-impact errors in less time.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'After your next timed essay, give yourself exactly two minutes to run through the checklist before time runs out.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I always leave two minutes for a final check.',
              'I check word count and task coverage first, since these matter most.',
              'I do not try to reread the entire essay in the last two minutes.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Practising this checklist under real time pressure is the only way it becomes a fast habit instead of an afterthought.',
          },
        ],
      },
    ],
  },
];
