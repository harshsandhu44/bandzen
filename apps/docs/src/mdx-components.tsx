import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';

import { cn } from '@bandzen/ui/lib/utils';

import { Callout } from '@/components/callout';
import { AwardTable, BandTable } from '@/components/tables';
import { Ruler } from '@/components/ruler';

/**
 * Every prose element, mapped onto the design system.
 *
 * There is no `@tailwindcss/typography` in this repo and there should not be:
 * `prose` ships a type scale, a colour ramp and a set of margins that were
 * decided by someone who had not seen `@bandzen/ui`. Mapping the dozen elements
 * that actually appear in these pages is less code than overriding it.
 *
 * The two rules from `primitives.tsx` hold here as they do in the product:
 * headings are Archivo sentence case (`.font-title`), and mono is for
 * instrumentation — a figure, a slug, a column name — never for a heading.
 *
 * Components exposed on this map (`Callout`, `Ruler`) need no import inside an
 * `.mdx` file, which keeps the top of every page free of boilerplate.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ className, ...props }) => (
      <h1
        className={cn('font-title text-title-lg mb-4', className)}
        {...props}
      />
    ),
    // `scroll-mt` clears the sticky header when the TOC or a #anchor jumps here.
    h2: ({ className, ...props }) => (
      <h2
        className={cn(
          'font-title text-title mt-14 mb-3 scroll-mt-24 border-t border-border pt-8 first:mt-0 first:border-0 first:pt-0',
          className,
        )}
        {...props}
      />
    ),
    h3: ({ className, ...props }) => (
      <h3
        className={cn('font-title mt-8 mb-2 scroll-mt-24 text-base', className)}
        {...props}
      />
    ),
    p: ({ className, ...props }) => (
      <p
        className={cn('mt-4 text-[0.9375rem] leading-7 text-pretty', className)}
        {...props}
      />
    ),
    ul: ({ className, ...props }) => (
      <ul
        className={cn(
          'mt-4 space-y-2 pl-5 text-[0.9375rem] leading-7',
          className,
        )}
        {...props}
      />
    ),
    ol: ({ className, ...props }) => (
      <ol
        className={cn(
          'mt-4 list-decimal space-y-2 pl-5 text-[0.9375rem] leading-7',
          className,
        )}
        {...props}
      />
    ),
    // A square tick rather than a bullet: the same mark the logo puts under
    // band 9, at list scale.
    li: ({ className, ...props }) => (
      <li
        className={cn(
          'marker:text-chrome [ul>&]:list-[square] text-pretty',
          className,
        )}
        {...props}
      />
    ),
    // Not a decorative pull-quote. Used for the sentence a page exists to make.
    blockquote: ({ className, ...props }) => (
      <blockquote
        className={cn(
          'my-6 border-l-2 border-foreground py-1 pl-5 text-[0.9375rem] leading-7 text-pretty',
          className,
        )}
        {...props}
      />
    ),
    // Tables carry figures — band conversions, quotas, award thresholds — so
    // they get tabular numerals, and they scroll inside themselves rather than
    // pushing the page sideways on a phone.
    table: ({ className, ...props }) => (
      <div className="my-6 overflow-x-auto">
        <table
          className={cn(
            'w-full border-collapse text-left text-sm tabular-nums',
            className,
          )}
          {...props}
        />
      </div>
    ),
    th: ({ className, ...props }) => (
      <th
        className={cn(
          'border-b border-border pb-2 pr-6 font-mono text-[0.6875rem] font-medium tracking-[0.18em] text-muted-foreground uppercase',
          className,
        )}
        {...props}
      />
    ),
    td: ({ className, ...props }) => (
      <td
        className={cn(
          'border-b border-border py-2.5 pr-6 align-top',
          className,
        )}
        {...props}
      />
    ),
    code: ({ className, ...props }) => (
      <code
        className={cn(
          'bg-muted px-1.5 py-0.5 font-mono text-[0.8125rem]',
          className,
        )}
        {...props}
      />
    ),
    pre: ({ className, ...props }) => (
      <pre
        className={cn(
          'my-6 overflow-x-auto border border-border bg-muted p-4 font-mono text-[0.8125rem] leading-6 [&_code]:bg-transparent [&_code]:p-0',
          className,
        )}
        {...props}
      />
    ),
    hr: ({ className, ...props }) => (
      <hr className={cn('my-10 border-border', className)} {...props} />
    ),
    strong: ({ className, ...props }) => (
      <strong className={cn('font-semibold', className)} {...props} />
    ),
    a: ({ href = '', className, ...props }) => {
      const external = href.startsWith('http');
      const style = cn(
        'text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className,
      );
      return external ? (
        <a
          href={href}
          className={style}
          rel="noreferrer noopener"
          target="_blank"
          {...props}
        />
      ) : (
        <Link href={href} className={style} {...props} />
      );
    },
    AwardTable,
    BandTable,
    Callout,
    Ruler,
    ...components,
  };
}
