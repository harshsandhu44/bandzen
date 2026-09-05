import type { LessonSeed } from './types';

/**
 * Listening: 10 lessons, beginner to expert. 3 foundations, 4 question-types,
 * 3 advanced.
 */
export const LISTENING_LESSONS: LessonSeed[] = [
  {
    slug: 'listening-scoring-basics',
    module: 'listening',
    group: 'foundations',
    title: 'How IELTS Listening works',
    summary:
      'Four sections, forty questions, one play only. Know the shape of the test before test day.',
    minutes: 6,
    questionKind: null,
    orderIndex: 0,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'IELTS Listening has four sections and forty questions. You hear the audio only once — there is no replay.',
          },
          {
            kind: 'prose',
            body: 'Sections 1 and 2 are everyday topics, like booking a hotel. Sections 3 and 4 are more academic, like a university lecture.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'You only hear it once',
            body: 'If you miss an answer, you cannot go back. Keep your eyes on the next question instead of worrying about the one you missed.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Section 1: a conversation about everyday information, like a booking.',
              'Section 2: a talk about a place or event.',
              'Section 3: a conversation, usually about study.',
              'Section 4: a lecture given by one speaker.',
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
              'You miss question 6 completely while thinking about question 5. What should you do?',
            answer: 'Move on to question 7 immediately.',
            why: 'The audio keeps playing. Staying stuck on question 6 risks missing question 7 as well.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Listen to any short audio clip once, without pausing or replaying, and try to note the key facts.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I know there are four sections and forty questions.',
              'I know the audio only plays once.',
              'I know sections get harder as the test goes on.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Listen to English audio regularly outside of IELTS practice — podcasts, videos, the news. This builds the same skill the test uses.',
          },
        ],
      },
    ],
  },
  {
    slug: 'listening-reading-questions-first',
    module: 'listening',
    group: 'foundations',
    title: 'Reading questions before you listen',
    summary:
      'You get time before each section starts. Use it to know exactly what you are listening for.',
    minutes: 7,
    questionKind: null,
    orderIndex: 1,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Before each section plays, you get time to look at the questions. This time is one of your biggest advantages — use every second of it.',
          },
          {
            kind: 'prose',
            body: 'If you know what information you need before the audio starts, you can catch it the moment it is said.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: 'Question: "The delivery will arrive on ___ (day of the week)."',
            question: 'What should you think before the audio plays?',
            answer: 'I need to listen for a day of the week, nothing else.',
            why: 'Knowing exactly what kind of word is missing lets you ignore other details and focus only on the day mentioned.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You have 20 seconds before a section starts. What is the best use of that time?',
            answer: 'Read every question and predict what type of answer each one needs.',
            why: 'This short preview turns listening from a passive activity into an active, focused search for specific information.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Before your next practice section, spend one full minute just reading the questions and guessing what kind of word each answer will be.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I read all questions in a section before the audio starts.',
              'I predict the type of word needed for each gap (a name, a number, a place).',
              'I use every second of preview time given.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'If you run out of preview time before finishing all the questions, prioritise reading the first few — the audio starts there first.',
          },
        ],
      },
    ],
  },
  {
    slug: 'listening-spelling-numbers-forms',
    module: 'listening',
    group: 'foundations',
    title: 'Spelling, numbers, and forms',
    summary:
      'Names, numbers, and dates are easy to hear but easy to write down wrong.',
    minutes: 8,
    questionKind: null,
    orderIndex: 2,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Many Listening answers are names, numbers, or dates. These feel simple, but small mistakes here are very common.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Spelling counts',
            body: 'A correct answer spelled wrong is marked wrong. Know how to write out letters spoken one by one, like "S-M-I-T-H".',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: 'Speaker: "That\'s spelled T-H-O-M-P-S-O-N, Thompson."',
            question: 'What is the safest way to answer this question?',
            answer: 'Write the letters as they are spelled out, not as you think the name sounds.',
            why: 'Many names have unusual spelling. Trusting the spelled-out letters avoids common surname mistakes.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You hear "fifteen" but you are not sure if it was "fifteen" or "fifty". What should you do?',
            answer: 'Write your best guess and move on — do not freeze.',
            why: '"Fifteen" and "fifty" sound similar. If you are unsure, a quick decision is better than losing the next answer while you hesitate.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Practise writing down spoken numbers and spelled names from any short audio or video, focusing purely on accuracy.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I can confidently tell the difference between similar-sounding numbers like "13" and "30".',
              'I write names exactly as spelled, not as they sound to me.',
              'I check my numbers make sense with the rest of the sentence.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Practise the specific number pairs that trip up most learners: 13/30, 14/40, 15/50, and so on. These come up often.',
          },
        ],
      },
    ],
  },
  {
    slug: 'listening-multiple-choice-simple',
    module: 'listening',
    group: 'question-types',
    title: 'Multiple choice',
    summary:
      'The speaker often mentions two wrong options before saying the right one — listen to the whole sentence.',
    minutes: 8,
    questionKind: 'multiple_choice',
    orderIndex: 0,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'In Listening multiple choice, speakers often correct themselves or mention several options before giving the final answer.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Wait for the final answer',
            body: 'The first option mentioned is often wrong or changes later. Do not select an answer the moment you hear a match.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'Speaker: "We were going to meet on Tuesday, but actually, let\'s make it Thursday instead."',
            question: 'A) Tuesday B) Wednesday C) Thursday — which is correct?',
            answer: 'C, Thursday.',
            why: 'The speaker first says Tuesday, then corrects to Thursday. The correction is the real, final answer.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You hear the exact words of option A very clearly early in a sentence. Is it safe to choose it immediately?',
            answer: 'No, keep listening to the end of the sentence.',
            why: 'Listening multiple choice questions often test whether you catch a correction or change later in the same sentence.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Try a multiple choice listening set. For each question, note if the speaker mentioned more than one option before the real answer.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I listen to the whole sentence before choosing an answer.',
              'I watch for words like "actually", "sorry", and "I mean" that signal a correction.',
              'I do not lock in an answer the instant I hear a matching word.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Notice which correction words a speaker tends to use. Recognising them quickly gives you an early warning that the answer is about to change.',
          },
        ],
      },
    ],
  },
  {
    slug: 'listening-matching-simple',
    module: 'listening',
    group: 'question-types',
    title: 'Matching',
    summary:
      'Match each item to one option from a shared list — and cross off options as you use them.',
    minutes: 8,
    questionKind: 'matching',
    orderIndex: 1,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Matching questions give you a list of items and a list of options. You connect each item to the option that fits, based on what you hear.',
          },
          {
            kind: 'prose',
            body: 'Some options may not be used at all, and this is normal — do not assume every option is a correct answer.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'Speaker: "Room 1 is for beginners, Room 2 is for the advanced group, and Room 3 is currently closed for repairs."',
            question:
              'Match: Beginners class → ? Advanced class → ? (Options: Room 1, Room 2, Room 3)',
            answer: 'Beginners class → Room 1. Advanced class → Room 2.',
            why: 'Room 3 is mentioned but does not match any class — it is an unused option, which is normal in matching questions.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You have already used option B for one item. Can you use option B again for a different item?',
            answer: 'It depends on the instructions, but usually each option is used only once unless stated otherwise.',
            why: 'Read the instructions carefully — most matching tasks use each option once, but a few allow repeats.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Try a matching set. Before listening, read the whole option list, since matching requires holding several options in mind at once.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I read all items and all options before listening.',
              'I check the instructions to see if options can repeat.',
              'I do not assume every option must be used.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Matching is often the fastest-spoken question type. Practising this type specifically builds speed for holding several options in memory.',
          },
        ],
      },
    ],
  },
  {
    slug: 'listening-map-plan-labelling',
    module: 'listening',
    group: 'question-types',
    title: 'Map and plan labelling',
    summary:
      'Follow spoken directions on a map in real time, using words like "left", "opposite", and "next to".',
    minutes: 9,
    questionKind: null,
    orderIndex: 2,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Map labelling gives you a picture — often a building or town — and you write letters or numbers onto blank spots as directions are given.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'Direction words matter most',
            body: 'Words like "opposite", "next to", "behind", and "turn left" carry most of the meaning here. Learn them well.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'Speaker: "The library is directly opposite the main entrance, and the cafe is just to the left of it."',
            question:
              'If the main entrance is marked, where do you place the library?',
            answer: 'Directly across from the main entrance.',
            why: '"Opposite" means facing, across from something. Placing the library anywhere else would misread the direction.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You lose track of where you are on the map for a few seconds. What should you do?',
            answer: 'Find the next clear landmark mentioned and use it to relocate yourself.',
            why: 'Speakers usually mention a fixed point again soon. Waiting for that anchor is faster than trying to reconstruct the whole path.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Practise following spoken directions on any simple map, using only direction words like left, right, opposite, and next to.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I know common direction words like opposite, next to, and behind.',
              'I keep track of a fixed starting point on the map.',
              'I do not panic if I lose my place — I wait for the next clear landmark.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Practise this question type more than others if directions confuse you in your own language too — it is a specific skill, not just a listening skill.',
          },
        ],
      },
    ],
  },
  {
    slug: 'listening-note-table-completion',
    module: 'listening',
    group: 'question-types',
    title: 'Note and table completion',
    summary:
      'Gaps in notes or a table must be filled with information from the audio, following the same word limit rules as Reading.',
    minutes: 8,
    questionKind: 'sentence_completion',
    orderIndex: 3,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Note and table completion gives you a partly finished set of notes. You fill the gaps using words you hear in the audio.',
          },
          {
            kind: 'prose',
            body: 'Just like Reading, there is a word limit for each answer, and going over it makes the answer wrong.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'Speaker: "The workshop starts at half past nine, in the main hall."',
            question: 'Notes: "Time: ___ Location: ___"',
            answer: 'Time: 9:30 (or half past nine). Location: main hall.',
            why: 'Both answers come straight from the audio. The notes structure tells you exactly what kind of information goes in each blank.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'The gap follows the words "Cost: $___". What kind of answer do you expect?',
            answer: 'A number, likely with a currency symbol.',
            why: 'The label "Cost" and the dollar sign both tell you the answer is a number, so you can listen specifically for one.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Try a note completion set. Before listening, guess the type of word for every gap based on the labels around it.',
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
              'I use the notes structure to predict each answer type.',
              'I spell answers exactly as heard, especially names and places.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Practise writing quickly without looking down at your paper for too long — you can lose the next few seconds of audio while you write.',
          },
        ],
      },
    ],
  },
  {
    slug: 'listening-catching-distractors',
    module: 'listening',
    group: 'advanced',
    title: 'Catching distractors',
    summary:
      'A distractor is information designed to seem right before it changes. Learn the phrases that warn you one is coming.',
    minutes: 9,
    questionKind: null,
    orderIndex: 0,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'A distractor is wrong information said before the real answer, designed to catch listeners who stop paying attention too early.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Common warning phrases',
            body: 'Phrases like "actually", "on second thought", "I mean", and "sorry, let me correct that" often introduce the real answer after a distractor.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'Speaker: "The fee is $50 — oh wait, sorry, that\'s the old price. It\'s actually $65 now."',
            question: 'What is the correct fee?',
            answer: '$65.',
            why: 'The first number, $50, is a distractor. The phrase "actually" signals the corrected, real answer that follows.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You already wrote down the first number you heard for an answer. The speaker then says "actually". What should you do?',
            answer: 'Cross it out and replace it with whatever comes after "actually".',
            why: 'This word is one of the clearest signals in Listening that the previous piece of information was a distractor, not the final answer.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Listen for correction phrases in any English audio this week and notice how often speakers naturally correct themselves mid-sentence.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I recognise phrases that signal a correction is coming.',
              'I stay ready to update an answer even after writing it down.',
              'I do not assume the first piece of matching information is the final answer.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Build a personal list of correction phrases you notice in practice tests. Recognising them instantly becomes a real time-saver.',
          },
        ],
      },
    ],
  },
  {
    slug: 'listening-different-accents',
    module: 'listening',
    group: 'advanced',
    title: 'Different accents',
    summary:
      'IELTS uses British, Australian, American, and Canadian accents. Familiarity, not talent, is what makes accents easier.',
    minutes: 8,
    questionKind: null,
    orderIndex: 1,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'IELTS Listening uses speakers from several English-speaking countries. If you have only practised with one accent, others can feel harder at first.',
          },
          {
            kind: 'prose',
            body: 'This is a matter of exposure, not ability. Regular practice with different accents removes most of the difficulty over time.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Notice which sounds change most between accents, like the letter "r" or vowel sounds.',
              'Listen to short clips from British, Australian, and North American speakers each week.',
              'Focus on meaning, not on identifying the accent by name.',
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
              'You hear an accent you have never practised with. Should you panic?',
            answer: 'No — focus on the words you do understand and stay calm.',
            why: 'Panicking wastes attention. Most words remain recognisable even in an unfamiliar accent, especially with practice.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Watch or listen to short videos from a few different English-speaking countries this week, purely to get your ear used to the differences.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I have listened to more than one English accent in my practice.',
              'I stay calm rather than panicking when an accent feels unfamiliar.',
              'I focus on understanding meaning, not perfectly identifying every sound.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'If one accent consistently gives you trouble, deliberately practise with more audio from that specific accent in the weeks before your test.',
          },
        ],
      },
    ],
  },
  {
    slug: 'listening-staying-focused',
    module: 'listening',
    group: 'advanced',
    title: 'Staying focused for 30 minutes',
    summary:
      'Losing concentration for even ten seconds can cost you several answers. Build the habit of steady focus.',
    minutes: 8,
    questionKind: null,
    orderIndex: 2,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Listening runs for about thirty minutes without a pause. A short lapse in focus can mean missing several questions in a row.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'Recovery matters more than perfection',
            body: 'Everyone loses focus occasionally. What matters is how fast you get back on track, not staying perfect the whole time.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'steps',
            items: [
              'If your mind drifts, do not dwell on what you missed.',
              'Find the next question number and refocus there immediately.',
              'Use the short breaks between sections to physically reset — breathe, sit up straight.',
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
              'You realise you have not been paying attention for the last two questions. What is the best next step?',
            answer: 'Immediately locate the current question number and refocus, without trying to recall the missed answers.',
            why: 'Trying to recall missed audio wastes more attention. The fastest recovery is to fully commit to the present question.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Practise a full 30-minute Listening test in one sitting, without pausing, to build real stamina rather than short bursts of focus.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I have practised full-length Listening sections, not just short clips.',
              'I know how to recover quickly after losing focus.',
              'I use section breaks to reset rather than to worry about earlier mistakes.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Focus is like fitness — it builds with regular practice at full length, not with short, easy sessions alone.',
          },
        ],
      },
    ],
  },
];
