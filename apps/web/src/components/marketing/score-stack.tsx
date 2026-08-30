import { ArrowUpRight, Sparkle } from 'lucide-react';

import { BandScale } from '@bandzen/ui/components/band-scale';
import { cn } from '@bandzen/ui/lib/utils';

import { sampleReport } from '@/content/sections';

import { PointerField } from './pointer-field';

/** Depth: layers translate against the pointer in proportion to this. */
const layer = (depth: number) =>
  ({
    transform:
      `translate3d(calc(var(--bz-px, 0) * ${depth}px), ` +
      `calc(var(--bz-py, 0) * ${depth}px), 0)`,
  }) satisfies React.CSSProperties;

/**
 * The hero's product surface. Layered, slightly rotated, overlapping — built
 * from real components rather than a screenshot. Everything here is server
 * rendered; only the pointer spring is client-side.
 */
export function ScoreStack({ className }: { className?: string }) {
  return (
    <PointerField className={cn('relative', className)}>
      {/* Back plate — gives the stack depth without a glow or a gradient. */}
      <div
        aria-hidden
        style={layer(-10)}
        className="border-border bg-secondary absolute inset-x-6 top-8 bottom-0 -rotate-2 border"
      />

      {/* The report */}
      <div
        style={layer(6)}
        className="border-ink bg-paper relative border p-6 pb-28 shadow-[8px_8px_0_0_var(--ink)] sm:p-8 sm:pb-32"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[0.625rem] tracking-[0.2em] uppercase opacity-60">
              Estimated band
            </p>
            <p className="font-display mt-1 text-6xl tabular-nums sm:text-7xl">
              {sampleReport.estimated.toFixed(1)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[0.625rem] tracking-[0.2em] uppercase opacity-60">
              Target
            </p>
            <p className="font-display relative mt-1 inline-block text-4xl tabular-nums sm:text-5xl">
              {sampleReport.target.toFixed(1)}
              <span
                aria-hidden
                className="bg-chrome absolute inset-x-0 -bottom-1 h-1"
              />
            </p>
          </div>
        </div>

        <ul className="mt-8 flex flex-col gap-4">
          {sampleReport.skills.map((skill) => (
            <li key={skill.label}>
              <BandScale
                variant="row"
                label={skill.label}
                value={skill.value}
                target={
                  skill.label === 'Writing' ? sampleReport.target : undefined
                }
              />
            </li>
          ))}
        </ul>

        <p className="mt-6 font-mono text-[0.625rem] tracking-[0.16em] uppercase opacity-50">
          <span className="sr-only">Note: </span>
          Illustrative sample report
        </p>
      </div>

      {/* AI insight — sits over the report edge, deliberately breaking the box. */}
      <div
        style={layer(18)}
        className="border-cobalt bg-cobalt text-paper absolute -right-3 bottom-4 max-w-[17rem] rotate-1 border p-4 shadow-[6px_6px_0_0_var(--ink)] sm:-right-8"
      >
        <p className="flex items-center gap-1.5 font-mono text-[0.625rem] tracking-[0.2em] uppercase opacity-80">
          <Sparkle className="size-3" aria-hidden />
          AI insight
        </p>
        <p className="mt-2 text-sm leading-snug">{sampleReport.insight}</p>
      </div>

      {/* Delta chip */}
      <div
        style={layer(26)}
        className="border-ink bg-chrome text-ink absolute -top-4 -left-3 -rotate-3 border px-3 py-1.5 sm:-left-8"
      >
        <p className="flex items-center gap-1 font-mono text-[0.6875rem] font-medium tabular-nums">
          <ArrowUpRight className="size-3.5" aria-hidden />
          {sampleReport.delta}
        </p>
      </div>
    </PointerField>
  );
}
