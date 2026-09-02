import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { NAV } from './nav';

export type SearchEntry = {
  href: string;
  /** The heading, or the page title for the page itself. */
  title: string;
  /** "For candidates › Progress", for the second line of a result. */
  trail: string;
};

export type Heading = { id: string; text: string; level: 2 | 3 };

export type DocsIndex = {
  /** Every page title and heading, for search. */
  entries: SearchEntry[];
  /** Page href → its headings, for the on-page table of contents. */
  headings: Record<string, Heading[]>;
};

const HEADING = /^(#{2,3})\s+(.+?)\s*$/gm;

/** rehype-slug's algorithm, for the characters these headings actually use. */
function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Every page's title and headings, read off the `.mdx` sources at build time.
 *
 * One pass produces both things that need them: the search index, and the
 * per-page heading lists the table of contents renders.
 *
 * Building the TOC here rather than reading the DOM after mount is what lets it
 * be server-rendered — and it keeps the only `setState` in `Toc` inside the
 * scroll observer's callback, where it belongs.
 *
 * Regex rather than a real MDX parse: these are our own files, every heading is
 * plain text, and a parser here would be a second MDX toolchain to keep in step
 * with the one that renders the pages. `rehype-slug` generates the ids these
 * anchors point at, so `slug()` has to agree with it — it does for the
 * alphanumeric headings used throughout.
 */
export async function buildDocsIndex(): Promise<DocsIndex> {
  const entries: SearchEntry[] = [];
  const headings: Record<string, Heading[]> = {};

  for (const group of NAV) {
    for (const page of group.pages) {
      entries.push({
        href: page.href,
        title: page.title,
        trail: group.title,
      });

      const file = join(process.cwd(), 'src/app/(docs)', page.href, 'page.mdx');

      let source: string;
      try {
        source = await readFile(file, 'utf8');
      } catch {
        // A page in the nav with no file yet. The nav entry is still findable.
        headings[page.href] = [];
        continue;
      }

      const found: Heading[] = [];
      for (const [, hashes, text] of source.matchAll(HEADING)) {
        const id = slug(text);
        found.push({ id, text, level: hashes.length === 2 ? 2 : 3 });
        entries.push({
          href: `${page.href}#${id}`,
          title: text,
          trail: `${group.title} › ${page.title}`,
        });
      }
      headings[page.href] = found;
    }
  }

  return { entries, headings };
}
