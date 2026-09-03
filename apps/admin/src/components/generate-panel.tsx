'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@bandzen/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@bandzen/ui/components/card';
import { Field } from '@bandzen/ui/components/field';
import { Input } from '@bandzen/ui/components/input';
import { Select } from '@bandzen/ui/components/select';

type Result = { id: string; title: string; href: string; warnings: string[] };

/**
 * Generate a draft with one gpt-5.5 call. Lands as a draft for review — the
 * warnings are the structural checks the model can still get wrong, not
 * blockers. Audio for listening/speaking is synthesized later in the editor.
 */
export function GeneratePanel({
  type,
  noun,
}: {
  /** The API route segment: passages | listening | speaking. */
  type: 'passages' | 'listening' | 'speaking';
  noun: string;
}) {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('3');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/generate/${type}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim() || undefined,
          difficulty: Number(difficulty),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Generation failed.');
      } else {
        setResult(data as Result);
      }
    } catch {
      setError('Generation failed — the request may have timed out. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate with AI</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {result ? (
          <div className="space-y-3 text-sm">
            <p>
              Created draft <span className="font-medium">{result.title}</span>.
            </p>
            {result.warnings.length > 0 ? (
              <div className="space-y-1">
                <p className="font-mono text-xs text-muted-foreground uppercase">
                  Review before publishing
                </p>
                <ul className="space-y-1 text-xs text-destructive">
                  {result.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No structural issues flagged. Still read it through.
              </p>
            )}
            <div className="flex gap-2">
              <Button nativeButton={false} render={<Link href={result.href} />}>
                Open editor
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResult(null)}
              >
                Generate another
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Field
              label="Topic"
              hint="Optional — leave blank and the model picks one."
            >
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={`e.g. urban beekeeping`}
              />
            </Field>
            <Field label="Difficulty" className="w-28">
              <Select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            {error ? (
              <p role="alert" className="font-mono text-xs text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="button" onClick={generate} disabled={busy}>
              {busy ? `Generating ${noun}…` : `Generate ${noun}`}
            </Button>
            {busy ? (
              <p className="text-xs text-muted-foreground">
                One model call — this takes up to a minute. Keep the tab open.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
