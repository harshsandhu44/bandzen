import type { LessonSeed } from './types';

/**
 * Speaking: 10 lessons, beginner to expert. 3 foundations, 4 question-types
 * (the three parts of the test), 3 advanced.
 */
export const SPEAKING_LESSONS: LessonSeed[] = [
  {
    slug: 'speaking-scoring-basics',
    module: 'speaking',
    group: 'foundations',
    title: 'How IELTS Speaking works',
    summary:
      'Three parts, one conversation, about fifteen minutes. Know the shape before you build the skills.',
    minutes: 6,
    questionKind: null,
    orderIndex: 0,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'IELTS Speaking has three parts. It feels like a conversation, but it is scored on four things: fluency, vocabulary, grammar, and pronunciation.',
          },
          {
            kind: 'prose',
            body: 'It lasts about eleven to fourteen minutes in total, with one examiner, usually recorded.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Part 1: short questions about yourself and familiar topics, around 4-5 minutes.',
              'Part 2: a long turn — you speak for up to two minutes on a topic from a card.',
              'Part 3: a deeper discussion connected to the Part 2 topic, around 4-5 minutes.',
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
              'You give a very short, one-word answer in Part 1. Is that a problem?',
            answer: 'Yes — short answers give the examiner little to score.',
            why: 'The examiner needs enough speech to judge your fluency, vocabulary, and grammar. A one-word answer does not give enough to work with.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Answer five simple questions about yourself out loud, aiming for two to three full sentences each, not single words.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I know the three parts and roughly how long each one lasts.',
              'I know the four things being scored.',
              'I answer in full sentences, not single words.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Record yourself answering a simple question. Listening back is uncomfortable but shows you exactly where you speak too little.',
          },
        ],
      },
    ],
  },
  {
    slug: 'speaking-part-1-basics',
    module: 'speaking',
    group: 'foundations',
    title: 'Part 1 basics',
    summary:
      'Simple questions about familiar topics — the goal is natural, comfortable answers, not perfect ones.',
    minutes: 7,
    questionKind: null,
    orderIndex: 1,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Part 1 asks about familiar things — your home, your work or studies, your hobbies. There are no trick questions here.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'You do not need impressive answers',
            body: 'A simple, natural answer scores better than a complicated one that is hard to follow or full of hesitation.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: 'Question: "Do you enjoy cooking?"',
            question: 'What makes a strong answer here?',
            answer:
              '"Yes, actually I enjoy it a lot. I usually cook dinner on weekends because it helps me relax after a busy week."',
            why: 'This answer gives a direct response, then adds a reason and a small detail. It is simple, natural, and easy to follow.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'The examiner asks "Where are you from?" Should you just name your city?',
            answer: 'No — add a short extra detail.',
            why: 'A one-word answer gives almost nothing to score. Adding a small detail, like what your city is known for, gives you more to work with.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Answer these out loud: What do you do in your free time? What is your hometown like? Do you like reading? Aim for two to three sentences each.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'My answers are two to three sentences long, not just one word.',
              'I add one small extra detail or reason to every answer.',
              'I stay relaxed — Part 1 is meant to be easy and familiar.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Practise common Part 1 topics — hometown, work, hobbies, food — until your answers come without much thinking time.',
          },
        ],
      },
    ],
  },
  {
    slug: 'speaking-confident-simple-sentences',
    module: 'speaking',
    group: 'foundations',
    title: 'Simple, confident sentences',
    summary:
      'A short, clear, correct sentence beats a long, confusing one every time.',
    minutes: 7,
    questionKind: null,
    orderIndex: 2,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Many candidates try to use long, complicated sentences to sound advanced, and then get lost halfway through.',
          },
          {
            kind: 'prose',
            body: 'A short sentence you say confidently and correctly is worth more than a long one that falls apart.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              '"I think that, well, because of my job, which is quite busy, sometimes, I don\'t always have time, to, um, do sports."',
            question: 'How could this be said more confidently?',
            answer: '"My job is busy, so I don\'t always have time for sports."',
            why: 'The shorter version says the same thing clearly, without hesitation words breaking up the sentence.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You are halfway through a long sentence and feel lost. What should you do?',
            answer: 'Finish the thought as a short, simple sentence instead.',
            why: 'Stopping to fix a complicated sentence mid-way often causes more hesitation. A simple finish keeps you speaking smoothly.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Take a topic you know well and speak about it for thirty seconds using only short, simple sentences.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I can speak in short, complete sentences without long pauses.',
              'I do not try to force complicated grammar I am unsure of.',
              'When I lose track mid-sentence, I finish simply rather than restarting several times.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Once short sentences feel easy, start joining two of them together naturally with a simple word like "because" or "so".',
          },
        ],
      },
    ],
  },
  {
    slug: 'speaking-part-2-long-turn',
    module: 'speaking',
    group: 'question-types',
    title: 'Part 2: the long turn',
    summary:
      'Speaking alone for up to two minutes feels different from a conversation — the cue card is your guide.',
    minutes: 8,
    questionKind: null,
    orderIndex: 0,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'In Part 2, you get a card with a topic and a few points to cover. You speak alone for one to two minutes without the examiner interrupting.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'The bullet points are your structure',
            body: 'The card usually gives three or four points to mention. Following them in order gives your talk a clear shape.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              'Card: "Describe a place you like to visit. Say where it is, why you go there, and how you feel when you are there."',
            question: 'How should you organise your two minutes?',
            answer: 'Cover each point in order: where it is, why you go, how you feel — then add a short closing thought.',
            why: 'Following the card in order is a simple, reliable structure that naturally fills the time without you needing to plan much.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You finish talking about the topic after only forty seconds. What should you do?',
            answer: 'Add more detail to points you already made, rather than stopping early.',
            why: 'Stopping early gives the examiner less to score. Going back to add examples or feelings extends your answer naturally.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Pick any simple topic — a favourite meal, a memorable trip — and speak about it alone for one full minute without stopping.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I use the bullet points on the card as my structure.',
              'I can speak for close to two minutes without long silences.',
              'I add extra detail if I finish early, rather than stopping.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Time yourself on practice cards. Most candidates either run out too early or run far over — knowing your pattern helps you fix it.',
          },
        ],
      },
    ],
  },
  {
    slug: 'speaking-one-minute-prep',
    module: 'speaking',
    group: 'question-types',
    title: 'Using your one-minute prep',
    summary:
      'Before Part 2, you get one minute and a pencil. Use it to build a skeleton, not full sentences.',
    minutes: 7,
    questionKind: null,
    orderIndex: 1,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Before your long turn, you get one minute to prepare and a paper to write notes on. This minute is short, so use it wisely.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Do not write full sentences',
            body: 'One minute is not enough to write a script. Write single words or short phrases as reminders, one per bullet point.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: 'Card: "Describe a skill you learned."',
            question: 'What should your one-minute notes look like?',
            answer: '"Skill: cooking. When: last year. How: online videos. Feeling: proud, useful."',
            why: 'These are short memory triggers, not sentences. They remind you what to say without wasting prep time writing full answers.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You spend your whole minute trying to write one perfect opening sentence. Is this a good use of time?',
            answer: 'No — spread your time across all the bullet points instead.',
            why: 'One polished sentence is far less useful than short notes covering the whole talk, since you need ideas for the full two minutes.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Take a practice cue card. Give yourself exactly sixty seconds to write only single-word notes, then speak from them.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I use my one minute to plan, not to write full sentences.',
              'My notes cover every bullet point on the card.',
              'I can speak fluently from short notes rather than reading them.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Practise this specific one-minute habit repeatedly — it is a skill on its own, separate from speaking ability.',
          },
        ],
      },
    ],
  },
  {
    slug: 'speaking-detail-and-examples',
    module: 'speaking',
    group: 'question-types',
    title: 'Adding detail and examples',
    summary:
      'Specific detail makes an answer memorable and shows off more of your English at once.',
    minutes: 8,
    questionKind: null,
    orderIndex: 2,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'A general answer is harder to score well because it gives little to work with. Specific details give you more chances to show good vocabulary and grammar.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: '"I visited a nice city last year."',
            question: 'How could this answer be made more specific?',
            answer:
              '"Last summer, I visited Lisbon for a week, and I remember the old trams and the food especially, particularly the fresh seafood by the harbour."',
            why: 'Adding a place name, a time, and specific sights or foods turns a flat sentence into a rich, detailed answer.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You cannot remember a real detail for a question about your childhood home. What should you do?',
            answer: 'Invent a believable detail rather than giving a vague answer.',
            why: 'The examiner scores your English, not the truth of your story. A specific invented detail is more useful than a vague true one.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Take three general sentences about yourself and rewrite each one with at least one specific name, number, or detail added.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'My answers include specific details, not just general statements.',
              'I feel comfortable inventing a plausible detail if I cannot recall a real one.',
              'I use details naturally, without listing them like a checklist.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Practise adding one sensory detail — a sound, smell, or sight — to your answers. This is a fast way to make speech sound richer.',
          },
        ],
      },
    ],
  },
  {
    slug: 'speaking-part-3-opinions',
    module: 'speaking',
    group: 'question-types',
    title: 'Part 3: opinions and reasons',
    summary:
      'Part 3 asks for your views on wider issues — always give a reason, not just an opinion.',
    minutes: 8,
    questionKind: null,
    orderIndex: 3,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Part 3 moves from the personal topic of Part 2 into a broader discussion, often about society or general trends.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'Reasons matter more than the opinion itself',
            body: 'There is no right or wrong opinion in Part 3. What matters is that you explain your reasoning clearly.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: 'Question: "Do you think technology has made people less social?"',
            question: 'What makes a strong answer here?',
            answer:
              '"In some ways, yes, because people often look at their phones instead of talking to those around them, especially in public places like buses or waiting rooms."',
            why: 'This gives a clear position, a reason, and a specific example — three things that together build a complete, convincing answer.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You are asked a question you have never thought about before. Should you say "I don\'t know"?',
            answer: 'No — think out loud and build an opinion in the moment.',
            why: '"I don\'t know" gives nothing to score. Even an uncertain opinion, explained with reasons, shows off your speaking ability.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Answer this out loud: "Do you think cities are better than small towns for young people?" Give an opinion and at least one reason.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I always give a reason after stating an opinion.',
              'I do not answer "I don\'t know" to unfamiliar questions.',
              'I can discuss general topics, not just my own personal experience.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Practise forming quick opinions on topics you have never considered before — current events, technology, education — to build speed under pressure.',
          },
        ],
      },
    ],
  },
  {
    slug: 'speaking-fluency-over-speed',
    module: 'speaking',
    group: 'advanced',
    title: 'Fluency over speed',
    summary:
      'Fluency means speaking smoothly, not speaking fast. A slower, steady pace often scores higher.',
    minutes: 8,
    questionKind: null,
    orderIndex: 0,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Many candidates think fast speech equals fluent speech. In fact, fluency means speaking without long, awkward pauses — speed is secondary.',
          },
          {
            kind: 'callout',
            tone: 'warning',
            title: 'Speed can hide mistakes — or cause them',
            body: 'Rushing often creates more grammar errors and makes pronunciation less clear. A steady pace is easier to control.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source:
              '"I-I think, um, it\'s, uh, good, because, um, it helps, um, people."',
            question: 'What is the real problem with this answer — speed or something else?',
            answer: 'The frequent pauses and filler words, not the speed itself.',
            why: 'The words come out slowly here, but the constant hesitation breaks the flow. Fluency is about smoothness, not pace.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You feel tempted to speak faster to sound more confident. Is this the right instinct?',
            answer: 'Not necessarily — a calm, steady pace often sounds more confident than rushed speech.',
            why: 'Confidence comes across through smoothness and control, not raw speed. Rushing can actually sound nervous.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Answer a question out loud deliberately slowly and steadily, focusing only on avoiding pauses and filler words like "um".',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I speak at a steady pace rather than rushing.',
              'I avoid filling pauses with "um" and "uh" as much as possible.',
              'I understand that smoothness matters more than speed.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'If pauses are frequent, practise replacing "um" with a short silent pause instead — it sounds far more natural and controlled.',
          },
        ],
      },
    ],
  },
  {
    slug: 'speaking-pronunciation-intonation',
    module: 'speaking',
    group: 'advanced',
    title: 'Pronunciation and intonation',
    summary:
      'Being understood matters more than sounding like a native speaker. Clear stress and rising and falling tone help most.',
    minutes: 8,
    questionKind: null,
    orderIndex: 1,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Pronunciation scoring is not about having a perfect accent. It is about being clear and easy to understand.',
          },
          {
            kind: 'prose',
            body: 'Intonation is the rise and fall of your voice. Flat, unchanging intonation can sound unnatural, even with correct words.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: '"Are you going to the party?" (said with a flat, unchanging tone)',
            question: 'What makes this sound unnatural, even if every word is correct?',
            answer: 'The lack of rising tone at the end, which questions normally have in English.',
            why: 'Yes/no questions usually rise in pitch at the end. A flat tone here can sound robotic, even with perfect grammar.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You mispronounce one word in an otherwise clear, well-organised answer. Should you worry a lot about this?',
            answer: 'No — one unclear word rarely matters if the rest of the answer is understandable.',
            why: 'Pronunciation is judged overall. A single slip in an otherwise clear answer has little effect on the total score.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Say five yes/no questions out loud, focusing on raising your tone clearly at the end of each one.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I focus on being clear, not on sounding like a native speaker.',
              'I use rising and falling tone naturally, especially in questions.',
              'I do not worry heavily over a single mispronounced word.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Record yourself and compare your intonation to a native speaker saying the same sentence. Small adjustments here add up quickly.',
          },
        ],
      },
    ],
  },
  {
    slug: 'speaking-handling-unclear-questions',
    module: 'speaking',
    group: 'advanced',
    title: "Handling questions you don't understand",
    summary:
      'Asking for clarification the right way is a skill, not a weakness.',
    minutes: 7,
    questionKind: null,
    orderIndex: 2,
    stages: [
      {
        id: 'understand',
        blocks: [
          {
            kind: 'prose',
            body: 'Sometimes you genuinely will not catch a question, especially in Part 3. Asking politely for clarification is completely acceptable.',
          },
          {
            kind: 'callout',
            tone: 'note',
            title: 'It will not lower your score',
            body: 'Asking a clear, polite question to check understanding does not damage your fluency score. Guessing wildly and answering the wrong question is worse.',
          },
        ],
      },
      {
        id: 'see',
        blocks: [
          {
            kind: 'example',
            source: 'Examiner asks a long, complex question you only half hear.',
            question: 'What is a natural way to ask for it again?',
            answer: '"Sorry, could you repeat that, please?" or "Do you mean whether people should...?"',
            why: 'Both are polite, natural phrases used by fluent speakers every day. They show good communication skills, not weakness.',
          },
        ],
      },
      {
        id: 'try',
        blocks: [
          {
            kind: 'try',
            question:
              'You only understand half of a Part 3 question. Should you guess and answer something unrelated?',
            answer: 'No — ask for clarification instead.',
            why: 'Answering the wrong question entirely looks worse than a brief, polite request to repeat or explain it.',
          },
        ],
      },
      {
        id: 'practice',
        blocks: [
          {
            kind: 'prose',
            body: 'Practise saying "Could you say that again, please?" and "Sorry, do you mean...?" out loud until they feel automatic and natural.',
          },
        ],
      },
      {
        id: 'check',
        blocks: [
          {
            kind: 'checklist',
            items: [
              'I know at least two natural phrases for asking someone to repeat a question.',
              'I ask for clarification instead of guessing wildly.',
              'I understand this does not hurt my score when done naturally.',
            ],
          },
        ],
      },
      {
        id: 'improve',
        blocks: [
          {
            kind: 'prose',
            body: 'Practise these clarification phrases enough that they come out smoothly, without hesitation, when you actually need them.',
          },
        ],
      },
    ],
  },
];
