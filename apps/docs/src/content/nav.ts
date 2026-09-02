/**
 * The whole site, in order, in one place.
 *
 * The sidebar, the sitemap and the search index all read this. Ordering is by
 * hand and has to be: documentation runs in the order someone meets the
 * product, and a directory listing would run in the order someone typed the
 * folder names.
 *
 * Adding a page means adding it here as well as writing the `.mdx`. That
 * duplication is deliberate — a page that exists but is unreachable from the
 * nav is a page nobody asked for, so the nav is the list that decides.
 */

export type DocPage = { href: string; title: string };
export type DocGroup = { title: string; blurb: string; pages: DocPage[] };

export const NAV: DocGroup[] = [
  {
    title: 'For candidates',
    blurb: 'Preparing for IELTS with Bandzen.',
    pages: [
      { href: '/candidates/what-bandzen-is', title: 'What Bandzen is' },
      { href: '/candidates/getting-in', title: 'Getting in' },
      { href: '/candidates/setting-up', title: 'Setting up' },
      { href: '/candidates/the-diagnostic', title: 'The diagnostic' },
      { href: '/candidates/your-study-plan', title: 'Your study plan' },
      { href: '/candidates/reading-practice', title: 'Reading practice' },
      {
        href: '/candidates/how-reading-is-marked',
        title: 'How reading is marked',
      },
      { href: '/candidates/writing-and-marking', title: 'Writing and marking' },
      { href: '/candidates/your-writing-report', title: 'Your writing report' },
      { href: '/candidates/lessons', title: 'Lessons' },
      { href: '/candidates/guides', title: 'Guides' },
      { href: '/candidates/coach', title: 'Bandzen Coach' },
      { href: '/candidates/progress', title: 'Progress' },
      { href: '/candidates/awards-and-streaks', title: 'Awards and streaks' },
      { href: '/candidates/plans-and-limits', title: 'Plans and limits' },
      { href: '/candidates/settings', title: 'Settings' },
    ],
  },
  {
    title: 'For teachers',
    blurb: 'Writing and publishing the content candidates practise on.',
    pages: [
      { href: '/teachers/getting-access', title: 'Getting access' },
      {
        href: '/teachers/passages-and-questions',
        title: 'Passages and questions',
      },
      { href: '/teachers/writing-prompts', title: 'Writing prompts' },
      { href: '/teachers/lessons', title: 'Lessons' },
      { href: '/teachers/guides', title: 'Guides' },
      { href: '/teachers/draft-and-published', title: 'Draft and published' },
      { href: '/teachers/importing-json', title: 'Importing JSON' },
    ],
  },
  {
    title: 'Reference',
    blurb: 'The scales, the question types, and what the words mean.',
    pages: [
      { href: '/reference/band-scale', title: 'The band scale' },
      { href: '/reference/question-types', title: 'Question types' },
      { href: '/reference/glossary', title: 'Glossary' },
    ],
  },
];

/** Flat, for the sitemap and the search index. */
export const ALL_PAGES: DocPage[] = NAV.flatMap((group) => group.pages);
