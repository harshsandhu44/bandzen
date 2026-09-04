'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, Square } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { cn } from '@bandzen/ui/lib/utils';
import { QuotaMeter, resetLabel } from '@/components/billing/pro';
import { Markdown } from '@/components/coach/markdown';
import type { Allowance } from '@/lib/entitlements';

type Message = { role: 'user' | 'assistant'; content: string };

/**
 * The Coach conversation.
 *
 * The thread lives here and is gone on refresh. That is a deliberate choice
 * rather than a missing feature: persisting it means a table, a retention
 * policy and a second scoped query surface, and none of that earns its keep
 * until someone asks to come back to an old answer.
 */
export function CoachChat({
  prompts,
  quota,
  timezone,
}: {
  prompts: readonly string[];
  quota: Allowance;
  /** The candidate's zone: this renders in the browser, the meters do not. */
  timezone?: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Counted down here as well as on the server, so the number a candidate is
  // looking at is the number they have — a meter that only updates on refresh
  // is worse than no meter, because it is confidently wrong.
  const [left, setLeft] = useState(quota.remaining);
  const [spent, setSpent] = useState(!quota.allowed);
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming || spent) return;

    const next: Message[] = [...messages, { role: 'user', content: question }];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setDraft('');
    setError(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

      // 402 is the quota, and it is not a failure — it has its own answer and
      // its own next step, so it must never fall into the generic catch below.
      if (response.status === 402) {
        setMessages(next.slice(0, -1));
        setSpent(true);
        setLeft(0);
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error(`Coach responded ${response.status}`);
      }

      setLeft((n) => Math.max(0, n - 1));

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        // Replace the trailing assistant message as text arrives.
        setMessages([...next, { role: 'assistant', content: answer }]);
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
      }

      if (!answer) throw new Error('Coach returned nothing');
    } catch (cause) {
      if (controller.signal.aborted) {
        // Stopping is not a failure; keep whatever arrived.
        setMessages((current) => current.filter((m) => m.content.length > 0));
      } else {
        console.error(cause);
        setMessages(next);
        setError('Coach could not answer just then. Try asking again.');
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col gap-6">
      <div
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="flex-1 space-y-6 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="max-w-prose text-sm text-muted-foreground text-pretty">
              Coach can see your estimated bands, your marked essays and which
              question types you get wrong. Ask about any of it.
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {prompts.map((prompt) => (
                <li key={prompt}>
                  <button
                    type="button"
                    onClick={() => void send(prompt)}
                    className="w-full border border-border px-3 py-2.5 text-left text-sm transition-colors hover:border-foreground/30"
                  >
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          messages.map((message, i) => (
            <div
              key={i}
              className={cn(
                'space-y-1.5',
                message.role === 'user' && 'border-l-2 border-primary pl-4',
              )}
            >
              <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
                {message.role === 'user' ? 'You' : 'Bandzen Coach'}
              </p>
              {message.content ? (
                message.role === 'assistant' ? (
                  <Markdown>{message.content}</Markdown>
                ) : (
                  <div className="max-w-prose space-y-3 text-sm/relaxed text-pretty">
                    {message.content.split('\n\n').map((para, j) => (
                      <p key={j}>{para}</p>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-sm text-muted-foreground">Thinking…</p>
              )}
            </div>
          ))
        )}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      {/* Replaces the composer rather than disabling it. A dead input a
          candidate can still type into is a worse answer than a sentence
          saying what happened and when it changes. */}
      {spent ? (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-sm">
            You have used this week&rsquo;s {quota.limit} Coach messages.
            {quota.resetsAt ? (
              <>
                {' '}
                Your next free message is {resetLabel(quota.resetsAt, timezone)}
                .
              </>
            ) : null}
          </p>
          <Button
            nativeButton={false}
            render={<Link href="/upgrade?from=coach_wall" />}
          >
            Unlimited Coach with Pro
            <ArrowUp className="rotate-90" />
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
          className="flex items-end gap-2 border-t border-border pt-4"
        >
          <label htmlFor="coach-input" className="sr-only">
            Ask Bandzen Coach
          </label>
          <textarea
            id="coach-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter breaks the line -- the convention
              // everyone already has in their fingers.
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send(draft);
              }
            }}
            rows={2}
            placeholder="Ask about your bands, a question type, or what to do next"
            className="min-h-16 flex-1 resize-y border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />

          {streaming ? (
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              aria-label="Stop"
              onClick={() => abortRef.current?.abort()}
            >
              <Square />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon-lg"
              aria-label="Send"
              disabled={!draft.trim()}
            >
              <ArrowUp />
            </Button>
          )}
        </form>
      )}

      {quota.unlimited ? null : (
        <QuotaMeter
          allowance={{ ...quota, remaining: left, used: quota.limit - left }}
          noun="Coach messages"
          source="coach_wall"
          timezone={timezone}
        />
      )}
    </div>
  );
}
