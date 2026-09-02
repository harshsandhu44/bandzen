import { Version } from '@bandzen/ui/components/version';
import { Wordmark } from '@bandzen/ui/components/wordmark';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@bandzen/ui/components/sidebar';

import { DocsNav } from '@/components/docs-nav';
import { Search } from '@/components/search';
import { Toc } from '@/components/toc';
import { buildDocsIndex } from '@/content/docs-index';

import pkg from '../../../package.json';

/**
 * The documentation shell.
 *
 * Same `Sidebar` as `apps/app` and `apps/admin`, for the same reasons it is
 * used there: it is `fixed inset-y-0 h-svh`, so its ground is the viewport's
 * height on a short page as well as a long one, and below `md` it becomes a
 * Sheet rather than disappearing.
 *
 * It has a header, like the CMS and unlike the product. `apps/app` has none
 * because its exam screens are full-bleed surfaces with their own sticky
 * header; nothing here goes full-bleed, and the header is where the search
 * trigger has to live — a shortcut nobody can see is a shortcut nobody uses.
 *
 * Three columns above `xl`, two below it, one below `md`. The TOC is the first
 * thing to go: it is a shortcut to headings that are still on the page.
 *
 * The index is built here, in a server component, and passed down: it reads
 * the `.mdx` sources off disk at build time, which is only possible above the
 * `'use client'` boundary. One pass feeds both the search dialog and the
 * table of contents, so neither has to parse anything in the browser.
 */
export default async function DocsLayout({ children }: LayoutProps<'/'>) {
  const { entries, headings } = await buildDocsIndex();

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="px-4 py-3">
          {/* Wordmark renders its own Link; wrapping it in another nests two
              anchors, which React rejects at hydration. */}
          <Wordmark href="/" className="self-start" tag="Docs" collapse />
        </SidebarHeader>

        <SidebarContent>
          <DocsNav />
        </SidebarContent>

        <SidebarFooter className="p-4">
          <Version value={pkg.version} />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-2.5 supports-backdrop-filter:backdrop-blur-sm sm:px-6">
          <SidebarTrigger />
          <div className="ml-auto">
            <Search index={entries} />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-6xl flex-1 gap-12 px-6 py-10 sm:px-10">
          <article className="min-w-0 max-w-[68ch] flex-1 pb-16">
            {children}
          </article>

          {/* `sticky` inside a `h-fit` aside: the rail follows the reader down a
              long page without stretching the row it sits in. */}
          <aside className="sticky top-24 hidden h-fit w-56 shrink-0 xl:block">
            <Toc headings={headings} />
          </aside>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
