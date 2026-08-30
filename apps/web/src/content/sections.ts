/**
 * All marketing copy and sample data in one place, so the words can be edited
 * without touching layout — and so the placeholder boundary is visible.
 *
 * Honesty rules that apply to everything in this file:
 *   · no invented user counts, no invented testimonials, no fake discounts
 *   · band figures are illustrative sample data, described as estimates
 *   · anything not yet real carries `placeholder: true`
 */

export const brand = {
  name: 'Bandzen',
  tagline: 'Own your band.',
  disclaimer:
    'Bandzen is an independent IELTS preparation platform and is not affiliated with or endorsed by IELTS, the British Council, IDP, or Cambridge University Press & Assessment. Band estimates provided by Bandzen are for practice purposes and are not official IELTS scores.',
  disclaimerShort:
    'Independent and not affiliated with IELTS, the British Council, IDP, or Cambridge University Press & Assessment. Band estimates are for practice, not official scores.',
} as const;

export const nav = [
  { label: 'Learn', href: '#modules' },
  { label: 'Practice', href: '#practice' },
  { label: 'Mock Tests', href: '#mock-tests' },
  { label: 'AI Analysis', href: '#analysis' },
  { label: 'Resources', href: '#resources' },
  { label: 'Pricing', href: '#pricing' },
] as const;

/**
 * The product app is a separate deployment on its own subdomain, so every
 * CTA leaves this site. Override for local work against apps/app on :3002.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.bandzen.com';

export const cta = {
  primary: { label: 'Start preparing free', href: `${APP_URL}/signup` },
  secondary: { label: 'Take a diagnostic test', href: `${APP_URL}/diagnostic` },
  signIn: { label: 'Sign in', href: `${APP_URL}/sign-in` },
  nav: { label: 'Start preparing', href: `${APP_URL}/signup` },
} as const;

export const hero = {
  eyebrow: 'AI-powered IELTS preparation',
  headline: ['Your IELTS score', "isn't a mystery"],
  headlineAccent: 'anymore.',
  support:
    'Practice all four IELTS modules, take realistic mock tests, and understand exactly what is holding your score back with detailed AI analysis.',
  note: 'No credit card required.',
} as const;

/** Illustrative sample report — the shape of a real Bandzen estimate. */
export const sampleReport = {
  estimated: 7.0,
  target: 8.0,
  delta: '+0.5 band this month',
  insight: 'Your biggest opportunity is Writing Task 2.',
  skills: [
    { label: 'Listening', value: 8.0 },
    { label: 'Reading', value: 7.5 },
    { label: 'Speaking', value: 7.0 },
    { label: 'Writing', value: 6.5 },
  ],
} as const;

export const credibility = {
  headline: 'Prepare smarter. Understand every mistake.',
  items: [
    '4 IELTS modules',
    'Full-length mock tests',
    'AI-powered evaluation',
    'Personalised study plans',
    'Academic + General Training',
    'Question-type practice',
    'Detailed Writing feedback',
    'Speaking analysis',
  ],
} as const;

export const problem = {
  eyebrow: 'Why scores plateau',
  headline: "Doing more tests won't fix mistakes you don't understand.",
  support:
    'Bandzen analyses your performance beyond the final score, helping you identify exactly where marks are being lost.',
  feedback: [
    {
      module: 'Reading',
      criterion: 'True / False / Not Given',
      note: "You're consistently losing marks on True / False / Not Given questions because you're treating implied information as stated information.",
    },
    {
      module: 'Writing',
      criterion: 'Task Response',
      note: 'Your ideas are relevant, but paragraph development is limiting Task Response. Your estimated criterion score is 6.5.',
    },
    {
      module: 'Speaking',
      criterion: 'Lexical resource',
      note: 'Your fluency is strong, but repeated vocabulary and self-corrections are reducing clarity.',
    },
    {
      module: 'Listening',
      criterion: 'Section 3',
      note: 'You lose accuracy when two speakers disagree — the answer usually follows the correction, not the first claim.',
    },
  ],
} as const;

export const modules = {
  eyebrow: 'Four modules',
  headline: 'Every skill, practised the way it is tested.',
  support:
    'Each module has its own engine, its own question types, and its own feedback — because the examiner marks them differently too.',
} as const;

/** Reading module sample — the highlight marks the sentence carrying the answer. */
export const readingSample = {
  question: 'The research team expected the results they eventually recorded.',
  answer: 'FALSE',
  insight: 'Evidence found in paragraph C.',
  paragraphs: [
    {
      ref: 'B',
      text: 'Coastal seagrass meadows store carbon at rates far exceeding those of terrestrial forest, and interest in their restoration has grown accordingly.',
      highlight: null,
    },
    {
      ref: 'C',
      text: 'The team had anticipated a modest decline across the surveyed sites. ',
      highlight:
        'Instead, the meadows recovered more rapidly than any published model had predicted.',
    },
  ],
} as const;

export const listeningSample = {
  section: 'Section 3',
  duration: '04:12',
  insight: 'Two answers missed after a speaker correction at 02:41.',
  answers: [
    { n: 21, at: 8, ok: true },
    { n: 22, at: 21, ok: true },
    { n: 23, at: 34, ok: false },
    { n: 24, at: 52, ok: true },
    { n: 25, at: 68, ok: false },
    { n: 26, at: 84, ok: true },
  ],
} as const;

export const writingSample = {
  task: 'Task 2',
  prompt: 'Some people believe that universities should…',
  sentences: [
    {
      text: 'Governments should prioritise funding for vocational training. ',
      tone: 'good',
      label: 'Strong argument',
    },
    {
      text: 'This is because it are more directly linked to employment. ',
      tone: 'error',
      label: 'Grammar issue',
    },
    {
      text: 'Many graduates struggle to find relevant work after study. ',
      tone: 'weak',
      label: 'Needs supporting example',
    },
  ],
} as const;

export const speakingSample = {
  part: 'Part 2',
  transcript:
    "I'd like to talk about a place I visited last year, which was… um… a small town near the coast, and I think what made it, uh, memorable was the people.",
  metrics: [
    { label: 'Fluency', value: 7.5 },
    { label: 'Vocabulary', value: 6.5 },
    { label: 'Grammar', value: 7.0 },
    { label: 'Pronunciation', value: 7.5 },
  ],
  insight: 'Three filled pauses in 18 seconds are reducing fluency.',
} as const;

export const mockTest = {
  eyebrow: 'Mock tests',
  headline: "Practice like it's test day.",
  support:
    'Take complete IELTS mock tests under realistic timing and conditions.',
  badges: [
    {
      label: 'Accurate timing',
      note: 'The clock matches the real test, section by section.',
    },
    { label: 'Autosave', note: 'Answers are saved as you type.' },
    {
      label: 'Connection recovery',
      note: 'Drop offline and resume from where you stopped.',
    },
    {
      label: 'Review mode',
      note: 'Walk back through every question after you submit.',
    },
    {
      label: 'Academic and General Training',
      note: 'Both formats, on the same test engine.',
    },
  ],
  timer: '17:42',
  passage: 'Reading Passage 2',
  progress: { answered: 27, total: 40, flagged: [8, 19, 31] },
} as const;

export const analysis = {
  eyebrow: 'AI analysis',
  headline: ['A score tells you where you are.', 'Bandzen tells you why.'],
  support:
    'Every test is broken down by criterion and question type, so improvement has a target instead of a hope.',
  strengths: [
    'Reading comprehension',
    'Listening detail recognition',
    'Speaking fluency',
  ],
  needsWork: [
    'Writing Task Response',
    'Lexical repetition',
    'Matching headings',
  ],
  nextSteps: [
    'Writing Task 2: Developing arguments',
    'Matching headings practice',
    'Academic vocabulary drill',
  ],
} as const;

export const comparison = {
  eyebrow: 'The difference',
  headline: 'One of these loops ends at a higher band.',
  traditional: {
    title: 'Traditional preparation',
    steps: ['Take test', 'Get score', 'Take another test', 'Repeat'],
  },
  bandzen: {
    title: 'With Bandzen',
    steps: [
      'Take test',
      'Understand mistakes',
      'Practise the weakness',
      'Measure improvement',
      'Increase band',
    ],
  },
} as const;

export const studyPlan = {
  eyebrow: 'Study plan',
  headline: 'No more guessing what to study next.',
  support:
    'Your plan is rebuilt from your results. When a weakness closes, the next one takes its place.',
  target: 'Band 8',
  daysLeft: 42,
  days: [
    {
      label: 'Today',
      tasks: [
        { minutes: 20, title: 'Matching Headings', module: 'Reading' },
        { minutes: 30, title: 'Writing Task 2: arguments', module: 'Writing' },
        { minutes: 10, title: 'Academic vocabulary', module: 'Vocabulary' },
      ],
    },
    {
      label: 'Tomorrow',
      tasks: [
        { minutes: 25, title: 'Listening Section 3', module: 'Listening' },
        { minutes: 15, title: 'Speaking Part 2 practice', module: 'Speaking' },
      ],
    },
    {
      label: 'Thursday',
      tasks: [
        { minutes: 60, title: 'Full Reading mock', module: 'Reading' },
        { minutes: 20, title: 'Review flagged answers', module: 'Review' },
      ],
    },
  ],
} as const;

export const resources = {
  eyebrow: 'Study library',
  headline: 'Not only a test engine.',
  support:
    'Strategy, language and worked examples for every part of the exam — written to be read between practice sessions, not instead of them.',
  items: [
    { title: 'IELTS strategies', kind: 'Guides', count: 'Every module' },
    { title: 'Vocabulary', kind: 'Lists', count: 'Topic + academic' },
    { title: 'Grammar guides', kind: 'Guides', count: 'Common errors' },
    {
      title: 'Writing structures',
      kind: 'Templates',
      count: 'Task 1 + Task 2',
    },
    { title: 'Speaking cue cards', kind: 'Practice', count: 'Parts 1–3' },
    { title: 'Reading techniques', kind: 'Guides', count: 'By question type' },
    { title: 'Listening exercises', kind: 'Practice', count: 'Sections 1–4' },
    { title: 'Sample answers', kind: 'Examples', count: 'Band 6–9' },
  ],
} as const;

export const diagnostic = {
  eyebrow: 'Start here',
  headline: ["Don't know your IELTS level?", 'Find out.'],
  support:
    'Take a short diagnostic assessment and get your estimated band, strongest skills, weakest areas, and a personalised preparation plan.',
  cta: { label: 'Take the free diagnostic', href: `${APP_URL}/diagnostic` },
  result: 6.5,
} as const;

/**
 * PLACEHOLDER CONTENT. These are not real customers and these words were not
 * said by anyone. They exist to size and style the component; replace them
 * with genuine reviews before launch.
 */
export const testimonials = {
  eyebrow: 'Placeholder content',
  headline: 'Reviews land here.',
  note: 'Sample copy shown while we collect real reviews. No student has said these words.',
  items: [
    {
      initials: 'AR',
      role: 'Preparing for postgraduate study',
      quote:
        'The feedback finally told me why I was losing marks, not just how many.',
      placeholder: true,
    },
    {
      initials: 'MK',
      role: 'General Training, immigration',
      quote:
        'I stopped re-taking full tests every week and started fixing one thing at a time.',
      placeholder: true,
    },
    {
      initials: 'JD',
      role: 'Academic, engineering',
      quote:
        'Seeing the criterion breakdown for Writing made the difference. I knew exactly what to practise.',
      placeholder: true,
    },
    {
      initials: 'SP',
      role: 'Retaking after Band 6.5',
      quote: 'The study plan changed after every mock. That kept me honest.',
      placeholder: true,
    },
  ],
} as const;

export const pricing = {
  eyebrow: 'Pricing',
  headline: 'Start free. Upgrade when practice turns serious.',
  tiers: [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      placeholderPrice: false,
      features: [
        'Limited practice',
        'Diagnostic assessment',
        'Basic study materials',
        'Limited AI feedback',
      ],
      cta: 'Start free',
      featured: false,
    },
    {
      name: 'Pro',
      price: '$00',
      period: 'per month',
      placeholderPrice: true,
      features: [
        'Full mock tests',
        'Unlimited practice',
        'AI Writing analysis',
        'AI Speaking analysis',
        'Personalised study plan',
        'Advanced performance insights',
      ],
      cta: 'Start free',
      featured: true,
    },
  ],
} as const;

export const faq = {
  eyebrow: 'Questions',
  headline: 'Straight answers.',
  items: [
    {
      q: 'Is Bandzen affiliated with IELTS?',
      a: 'No. Bandzen is an independent preparation platform. It is not affiliated with or endorsed by IELTS, the British Council, IDP, or Cambridge University Press & Assessment.',
    },
    {
      q: 'Are Bandzen band estimates official?',
      a: 'No. Every band figure Bandzen produces is an estimate generated by our AI for practice purposes. Only the official test awards an IELTS band score.',
    },
    {
      q: 'Does Bandzen support Academic IELTS?',
      a: 'Yes. Academic Reading and Writing tasks are covered, alongside the shared Listening and Speaking modules.',
    },
    {
      q: 'Does Bandzen support General Training IELTS?',
      a: 'Yes. General Training Reading and Writing are covered, including Task 1 letters, with the same analysis and feedback.',
    },
    {
      q: 'Can I practise individual modules?',
      a: 'Yes. You can take a single module test, or drill one question type — matching headings, or Writing Task 2 alone — without sitting a full test.',
    },
    {
      q: 'How does AI Writing feedback work?',
      a: 'You write under timed conditions. Bandzen then assesses the response against the four public criteria — Task Response, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy — and returns sentence-level comments plus an estimated score per criterion.',
    },
    {
      q: 'Can Bandzen analyse Speaking?',
      a: 'Yes. You record your answers, and Bandzen transcribes them and reports on fluency, vocabulary, grammar and pronunciation. An AI Speaking examiner for live practice is planned.',
    },
    {
      q: 'Can I take complete mock tests?',
      a: 'Yes. Full-length mock tests run under realistic timing with autosave and connection recovery, followed by a complete analysis and review mode.',
    },
  ],
} as const;

export const finalCta = {
  headline: ['Your target band', 'starts here.'],
  band: '8.0',
} as const;

export const footer = {
  groups: [
    {
      title: 'Product',
      links: [
        { label: 'Practice', href: '#practice' },
        { label: 'Mock Tests', href: '#mock-tests' },
        { label: 'AI Analysis', href: '#analysis' },
        { label: 'Study Materials', href: '#resources' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'IELTS Reading', href: '#modules' },
        { label: 'IELTS Listening', href: '#modules' },
        { label: 'IELTS Writing', href: '#modules' },
        { label: 'IELTS Speaking', href: '#modules' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
      ],
    },
  ],
} as const;
