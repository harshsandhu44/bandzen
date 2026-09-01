'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { Button } from '@bandzen/ui/components/button';
import { Label } from '@bandzen/ui/components/label';
import { Textarea } from '@bandzen/ui/components/textarea';
import { importAction, type ImportState } from './actions';
import type { ImportEntity } from './registry';
import type { TemplateOption } from './templates';

/** Lives here, not in ./actions.ts: a 'use server' file may only export async functions. */
const initial: ImportState = { error: null, created: [] };

// The same string the other CMS forms each define locally, rather than a
// shared one -- following the convention already in resources/new and the rest.
const selectClass =
  'h-8 min-w-32 rounded-none border border-input bg-transparent px-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50';

/**
 * `ImportEntity` and the templates arrive as props rather than by importing the
 * registry here: the registry reaches the database, and this is a client
 * component. The type imports are erased at compile time.
 *
 * All of an entity's templates ship at once so switching between them is
 * instant. They are a few KB of text and the alternative is a page load per
 * variant.
 */
export function ImportForm({
  entity,
  noun,
  templates,
}: {
  entity: ImportEntity;
  noun: string;
  templates: TemplateOption[];
}) {
  const [state, action, pending] = useActionState(importAction, initial);
  const [variant, setVariant] = useState(templates[0].key);
  const [copied, setCopied] = useState(false);

  const selected = templates.find((t) => t.key === variant) ?? templates[0];

  async function copyTemplate() {
    await navigator.clipboard.writeText(selected.template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="variant">Template for</Label>
            <select
              id="variant"
              value={variant}
              onChange={(e) => {
                setVariant(e.target.value);
                setCopied(false);
              }}
              className={selectClass}
            >
              {templates.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={copyTemplate}
          >
            {copied ? 'Copied' : 'Copy template'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The rules and one worked example for this variant. Paste it into a
          model, paste what comes back into the box below.
        </p>
        <details className="group border border-border">
          <summary className="cursor-pointer list-none px-3 py-2 font-mono text-xs text-muted-foreground select-none hover:text-foreground">
            <span className="group-open:hidden">Show template</span>
            <span className="hidden group-open:inline">Hide template</span>
          </summary>
          <pre className="max-h-96 overflow-auto border-t border-border p-3 font-mono text-xs whitespace-pre-wrap">
            {selected.template}
          </pre>
        </details>
      </section>

      <form action={action} className="space-y-4">
        <input type="hidden" name="entity" value={entity} />
        <div className="space-y-2">
          <Label htmlFor="json">Paste JSON</Label>
          <Textarea
            id="json"
            name="json"
            rows={8}
            placeholder={`[\n  { … }\n]`}
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="file">…or upload a file</Label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".json,application/json"
            className="text-xs"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? 'Importing…' : 'Import'}
        </Button>
        {state.error ? (
          <p role="alert" className="font-mono text-xs text-destructive">
            {state.error}
          </p>
        ) : null}
      </form>

      {state.created.length > 0 ? (
        <section className="space-y-2 border-t border-border pt-4">
          <p className="text-sm">
            Imported {state.created.length} {noun}
            {state.created.length === 1 ? '' : 's'} as{' '}
            {state.created.length === 1 ? 'a draft' : 'drafts'}.
          </p>
          <ul className="space-y-1">
            {state.created.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/${entity}/${c.id}`}
                  className="text-sm hover:underline"
                >
                  {c.label}
                </Link>{' '}
                <span className="font-mono text-xs text-muted-foreground">
                  {c.slug}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
