'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@bandzen/ui/components/dialog';
import { Input } from '@bandzen/ui/components/input';
import { cn } from '@bandzen/ui/lib/utils';

import type { SearchEntry } from '@/content/docs-index';

const LIMIT = 8;

/**
 * Search, as a filter over a list.
 *
 * Not `cmdk` and not Algolia. The whole corpus is about thirty pages of our own
 * prose; the index is a few kilobytes of JSON built at build time, and matching
 * it is `includes()`. A search service would be a network dependency, an API
 * key and a crawl schedule for a site small enough to hold in memory.
 *
 * Ranking is title-prefix, then word-start, then substring, then trail —
 * enough that typing "band" puts "The band scale" near the top, and no more
 * than that.
 */
export function Search({ index }: { index: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const router = useRouter();
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((wasOpen) => !wasOpen);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return (
      index
        .map((entry) => {
          const title = entry.title.toLowerCase();
          if (title.startsWith(q)) return { entry, rank: 0 };
          // A match at the start of any word beats one buried mid-word, so
          // "band" puts "The band scale" above "Bandzen Coach".
          if (title.split(/\W+/).some((word) => word.startsWith(q))) {
            return { entry, rank: 1 };
          }
          if (title.includes(q)) return { entry, rank: 2 };
          if (entry.trail.toLowerCase().includes(q)) return { entry, rank: 3 };
          return null;
        })
        .filter((hit) => hit !== null)
        // A whole page outranks a heading that matched equally well: "The band
        // scale" is a better answer to "band" than one section of Progress is.
        .map((hit) => ({
          ...hit,
          rank: hit.rank * 2 + (hit.entry.href.includes('#') ? 1 : 0),
        }))
        .sort((a, b) => a.rank - b.rank)
        .slice(0, LIMIT)
        .map((hit) => hit.entry)
    );
  }, [index, query]);

  function go(entry: SearchEntry | undefined) {
    if (!entry) return;
    setOpen(false);
    setQuery('');
    router.push(entry.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[cursor]);
    }
  }

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-56"
      >
        <SearchIcon aria-hidden className="size-3.5 shrink-0" />
        <span className="hidden sm:inline">Search</span>
        {/* The shortcut is shown, not just bound — nobody guesses a shortcut. */}
        <kbd className="ml-auto hidden font-mono text-[0.625rem] tracking-[0.12em] sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-24 max-w-lg translate-y-0 gap-0 p-0 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">
            Search the documentation
          </DialogTitle>

          <Input
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              // A new query means the old cursor points at a different result.
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search the documentation"
            aria-label="Search the documentation"
            className="rounded-none border-0 border-b border-border focus-visible:ring-0"
          />

          {query.trim() ? (
            results.length > 0 ? (
              <ul ref={listRef} className="max-h-80 overflow-y-auto p-1">
                {results.map((entry, i) => (
                  <li key={entry.href}>
                    <button
                      type="button"
                      data-active={i === cursor}
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => go(entry)}
                      className={cn(
                        'block w-full px-3 py-2 text-left',
                        i === cursor && 'bg-accent',
                      )}
                    >
                      <span className="block text-sm">{entry.title}</span>
                      <span className="block font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase">
                        {entry.trail}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              // An empty result says what to do next, like the product's own
              // empty states, rather than reporting a count of zero.
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing matches “{query.trim()}”. Try a shorter word, or browse
                the sidebar.
              </p>
            )
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Search page titles and headings.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
