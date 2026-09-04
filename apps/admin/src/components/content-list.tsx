'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@bandzen/ui/components/button';
import { ConfirmDialog } from '@bandzen/ui/components/confirm-dialog';
import { Input } from '@bandzen/ui/components/input';
import { Select } from '@bandzen/ui/components/select';
import { EmptyState } from '@bandzen/ui/components/primitives';
import type { ContentStatus } from '@bandzen/db/schema';
import { StatusBadge } from '@/components/status-badge';
import { toastResult } from '@/components/toast';
import type { ActionResult } from '@/lib/action-result';

export type ListItem = {
  id: string;
  href: string;
  title: string;
  meta: string;
  status: ContentStatus;
};

export type BulkActions = {
  noun: string;
  publish: (ids: string[]) => Promise<ActionResult>;
  unpublish: (ids: string[]) => Promise<ActionResult>;
  remove: (ids: string[]) => Promise<ActionResult>;
};

export function ContentList({
  items,
  emptyTitle,
  emptyDescription,
  emptyAction,
  bulk,
  page = 1,
  hasMore = false,
}: {
  items: ListItem[];
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: React.ReactNode;
  bulk?: BulkActions;
  /** Current 1-indexed page, and whether a next page exists. Server-supplied. */
  page?: number;
  hasMore?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const filtering = !!q || !!status;

  const [term, setTerm] = useState(q);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function setParam(key: string, value: string, resetPage = false) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (resetPage) next.delete('page');
    router.replace(`${pathname}?${next}`);
  }

  // Push the search term to the URL after a pause, so every keystroke is not a
  // navigation. The input stays controlled by local state.
  useEffect(() => {
    if (term === q) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setParam('q', term, true), 250);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = items.length > 0 && selected.size === items.length;

  function run(op: (ids: string[]) => Promise<ActionResult>) {
    const ids = [...selected];
    startTransition(async () => {
      const result = await op(ids);
      toastResult(result);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          placeholder="Search title or slug"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="max-w-64"
        />
        <Select
          value={status}
          onChange={(e) => setParam('status', e.target.value, true)}
          className="w-36"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </Select>
        {/* ponytail: only exact when there's a single page — with no total-count
            query, a later page can't say how many rows exist beyond it. */}
        {filtering && page === 1 && !hasMore ? (
          <span className="font-mono text-xs text-muted-foreground">
            {items.length} match{items.length === 1 ? '' : 'es'}
          </span>
        ) : null}
      </div>

      {bulk && selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border border-border bg-muted/40 px-3 py-2">
          <span className="font-mono text-xs">{selected.size} selected</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(bulk.publish)}
          >
            Publish
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(bulk.unpublish)}
          >
            Unpublish
          </Button>
          <ConfirmDialog
            trigger={
              <Button type="button" size="sm" variant="destructive" disabled={pending}>
                Delete
              </Button>
            }
            title={`Delete ${selected.size} ${bulk.noun}${selected.size === 1 ? '' : 's'}?`}
            description="Published items in the selection, and any with student attempts, are skipped."
            confirmLabel="Delete"
            pending={pending}
            onConfirm={() => run(bulk.remove)}
          />
        </div>
      ) : null}

      {items.length === 0 ? (
        filtering ? (
          <p className="border-y border-border py-6 text-center text-sm text-muted-foreground">
            Nothing matches. Clear the filters to see everything.
          </p>
        ) : (
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
          />
        )
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {bulk ? (
            <li className="flex items-center gap-3 py-2">
              <input
                type="checkbox"
                aria-label="Select all"
                checked={allSelected}
                onChange={() =>
                  setSelected(
                    allSelected ? new Set() : new Set(items.map((i) => i.id)),
                  )
                }
              />
              <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
                Select all
              </span>
            </li>
          ) : null}
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              {bulk ? (
                <input
                  type="checkbox"
                  aria-label={`Select ${item.title}`}
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  className="text-sm hover:underline"
                >
                  {item.title}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {item.meta}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (page > 1 || hasMore) ? (
        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() =>
              setParam('page', page > 2 ? String(page - 1) : '')
            }
          >
            Previous
          </Button>
          <span className="font-mono text-xs text-muted-foreground">
            Page {page}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!hasMore}
            onClick={() => setParam('page', String(page + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
