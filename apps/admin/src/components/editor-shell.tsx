import type { ReactNode } from 'react';
import { Button } from '@bandzen/ui/components/button';

/**
 * The shape every content editor takes: the form on the left, a rail on the
 * right that stays in view — status, publish, a completeness read-out, the
 * preview link, who touched it last. One column below `lg`, rail first.
 */
export function EditorShell({
  children,
  rail,
}: {
  children: ReactNode;
  rail: ReactNode;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem]">
      <div className="order-2 min-w-0 space-y-6 lg:order-1">{children}</div>
      <aside className="order-1 space-y-5 lg:order-2 lg:sticky lg:top-6 lg:h-fit">
        {rail}
      </aside>
    </div>
  );
}

/**
 * The one Save. Sticks to the bottom of the form column so it is reachable
 * from anywhere in a long editor, and says plainly whether there is anything
 * to save.
 */
export function SaveBar({
  dirty,
  saving,
}: {
  dirty: boolean;
  saving: boolean;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-2 flex items-center gap-3 border-t border-border bg-background/95 px-2 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
      <Button type="submit" disabled={!dirty || saving}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
      {dirty && !saving ? (
        <span className="font-mono text-xs text-muted-foreground">
          Unsaved changes
        </span>
      ) : null}
    </div>
  );
}

/**
 * The rail's completeness read-out. `issues` comes straight from the
 * check*Completeness queries — an empty list means Publish will go through.
 */
export function CompletenessPanel({ issues }: { issues: string[] }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
        Before publishing
      </p>
      {issues.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nothing missing. Ready to publish.
        </p>
      ) : (
        <ul className="space-y-1 text-xs text-destructive">
          {issues.map((issue) => (
            <li key={issue}>Needs {issue}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
