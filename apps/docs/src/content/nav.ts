/**
 * The whole site, in order, in one place.
 *
 * The sidebar, the sitemap and the search index all read this. Ordering is by
 * hand and has to be: documentation runs in the order someone meets the
 * product, and a directory listing would run in the order someone typed the
 * folder names.
 *
 * Two levels under each top group. The section titles for candidates are the
 * product's own five destinations — Today, Learn, Practice, Progress, Coach —
 * plus a "Getting started" run-in and an "Account" tail, so a page here sits
 * under the same word the app puts it under. A section may omit its `title`
 * (Reference does), and then its pages sit flat under the group label.
 *
 * Adding a page means adding it here as well as writing the `.mdx`. That
 * duplication is deliberate — a page that exists but is unreachable from the
 * nav is a page nobody asked for, so the nav is the list that decides.
 */

export type DocPage = { href: string; title: string };

/**
 * A collapsible sub-heading in the sidebar. Omit `title` for a group whose
 * pages sit flat under the group label — `DocsNav` then renders the pages with
 * no `<details>` wrapper.
 */
export type DocSection = { title?: string; pages: DocPage[] };

export type DocGroup = { title: string; blurb: string; sections: DocSection[] };

export const NAV: DocGroup[] = [
  {
    title: 'For candidates',
    blurb: 'Preparing for IELTS with Bandzen.',
    sections: [
      {
        title: 'Getting started',
        pages: [
          { href: '/candidates/what-bandzen-is', title: 'What Bandzen is' },
          { href: '/candidates/getting-in', title: 'Getting in' },
          { href: '/candidates/setting-up', title: 'Setting up' },
          { href: '/candidates/the-diagnostic', title: 'The diagnostic' },
        ],
      },
      {
        title: 'Today',
        pages: [
          { href: '/candidates/today', title: 'The Today dashboard' },
          { href: '/candidates/your-study-plan', title: 'Your study plan' },
        ],
      },
      {
        title: 'Learn',
        pages: [
          { href: '/candidates/learn', title: 'Lessons and guides' },
          { href: '/candidates/learn/lessons', title: 'Lessons' },
          { href: '/candidates/learn/guides', title: 'Guides' },
        ],
      },
      {
        title: 'Practice',
        pages: [
          { href: '/candidates/practice', title: 'How practice works' },
          { href: '/candidates/practice/reading', title: 'Reading' },
          { href: '/candidates/practice/listening', title: 'Listening' },
          { href: '/candidates/practice/writing', title: 'Writing' },
          { href: '/candidates/practice/speaking', title: 'Speaking' },
          {
            href: '/candidates/practice/how-reading-is-marked',
            title: 'How reading is marked',
          },
          {
            href: '/candidates/practice/your-writing-report',
            title: 'Your writing report',
          },
        ],
      },
      {
        title: 'Progress',
        pages: [
          { href: '/candidates/progress', title: 'Progress' },
          {
            href: '/candidates/progress/awards-and-streaks',
            title: 'Awards and streaks',
          },
        ],
      },
      {
        title: 'Coach',
        pages: [{ href: '/candidates/coach', title: 'Bandzen Coach' }],
      },
      {
        title: 'Account',
        pages: [
          { href: '/candidates/plans-and-limits', title: 'Plans and limits' },
          { href: '/candidates/settings', title: 'Settings' },
        ],
      },
    ],
  },
  {
    title: 'For teachers',
    blurb: 'Writing and publishing the content candidates practise on.',
    sections: [
      {
        title: 'Getting started',
        pages: [{ href: '/teachers/getting-access', title: 'Getting access' }],
      },
      {
        title: 'Writing content',
        pages: [
          {
            href: '/teachers/passages-and-questions',
            title: 'Passages and questions',
          },
          { href: '/teachers/writing-prompts', title: 'Writing prompts' },
          { href: '/teachers/lessons', title: 'Lessons' },
          { href: '/teachers/guides', title: 'Guides' },
        ],
      },
      {
        title: 'Publishing',
        pages: [
          {
            href: '/teachers/draft-and-published',
            title: 'Draft and published',
          },
          { href: '/teachers/importing-json', title: 'Importing JSON' },
        ],
      },
    ],
  },
  {
    title: 'Reference',
    blurb: 'The scales, the question types, and what the words mean.',
    sections: [
      {
        pages: [
          { href: '/reference/band-scale', title: 'The band scale' },
          { href: '/reference/question-types', title: 'Question types' },
          { href: '/reference/glossary', title: 'Glossary' },
        ],
      },
    ],
  },
];

/** Flat, for the sitemap and the search index. */
export const ALL_PAGES: DocPage[] = NAV.flatMap((group) =>
  group.sections.flatMap((section) => section.pages),
);
