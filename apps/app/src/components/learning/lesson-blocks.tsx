import { Info, TriangleAlert } from 'lucide-react';
import type { LessonBlock } from '@/content/lesson-types';

/**
 * Renders one lesson block.
 *
 * A closed union with one branch each, so adding a block type is a compile
 * error here rather than a silently missing section on the page.
 */
export function LessonBlockView({ block }: { block: LessonBlock }) {
  switch (block.kind) {
    case 'prose':
      return (
        <p className="max-w-prose text-sm/relaxed text-pretty">{block.body}</p>
      );

    case 'steps':
      return (
        <ol className="max-w-prose space-y-2">
          {block.items.map((item, i) => (
            <li key={item} className="flex gap-3 text-sm/relaxed">
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );

    case 'checklist':
      return (
        <ul className="max-w-prose divide-y divide-border border-y border-border">
          {block.items.map((item) => (
            <li key={item} className="py-2.5 text-sm/relaxed">
              {item}
            </li>
          ))}
        </ul>
      );

    case 'callout': {
      const Icon = block.tone === 'warning' ? TriangleAlert : Info;
      const tone =
        block.tone === 'warning' ? 'border-destructive' : 'border-primary';
      return (
        <aside className={`max-w-prose border-l-2 ${tone} py-3 pr-4 pl-4`}>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {block.title}
          </p>
          <p className="mt-1 text-sm/relaxed text-muted-foreground text-pretty">
            {block.body}
          </p>
        </aside>
      );
    }

    case 'example':
      return (
        <figure className="max-w-prose space-y-3 border border-border p-4">
          <blockquote className="border-l-2 border-border pl-3 font-mono text-xs/relaxed text-muted-foreground">
            {block.source}
          </blockquote>
          <figcaption className="space-y-2">
            <p className="text-sm font-medium">{block.question}</p>
            <p className="text-sm">
              <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
                Answer
              </span>{' '}
              {block.answer}
            </p>
            <p className="text-sm/relaxed text-muted-foreground text-pretty">
              {block.why}
            </p>
          </figcaption>
        </figure>
      );

    case 'try':
      return (
        <div className="max-w-prose space-y-3 border border-border p-4">
          {block.source ? (
            <blockquote className="border-l-2 border-border pl-3 font-mono text-xs/relaxed text-muted-foreground">
              {block.source}
            </blockquote>
          ) : null}
          <p className="text-sm font-medium">{block.question}</p>
          {/* Native disclosure: the reader commits to an answer before
              revealing, and it costs no client JavaScript to do it. */}
          <details className="group">
            <summary className="cursor-pointer text-xs underline-offset-4 hover:underline">
              Show the answer
            </summary>
            <div className="mt-3 space-y-1.5">
              <p className="text-sm font-medium">{block.answer}</p>
              <p className="text-sm/relaxed text-muted-foreground text-pretty">
                {block.why}
              </p>
            </div>
          </details>
        </div>
      );

    case 'video':
      return (
        <figure className="max-w-prose space-y-2">
          <div className="aspect-video w-full border border-border">
            <iframe
              src={block.url}
              title={block.title ?? 'Lesson video'}
              className="size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {block.title ? (
            <figcaption className="text-xs text-muted-foreground">
              {block.title}
            </figcaption>
          ) : null}
        </figure>
      );
  }
}
