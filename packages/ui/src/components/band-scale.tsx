import { cn } from '@bandzen/ui/lib/utils';

/**
 * The ruler a score sits on. Defaults to IELTS's 0–9 in half bands, which is
 * what the marketing site and every IELTS screen draw; other exams pass theirs
 * (PTE 10–90, TOEFL 1–6, DET 10–160).
 */
export type ScaleSpec = {
  min: number;
  max: number;
  step: number;
  /** What the exam calls the number: "Band" or "Score". */
  label: string;
};

export const IELTS_SCALE: ScaleSpec = {
  min: 0,
  max: 9,
  step: 0.5,
  label: 'Band',
};

/** Position of a value on the ruler, as a percentage. */
const pct = (value: number, scale: ScaleSpec = IELTS_SCALE) =>
  ((value - scale.min) / (scale.max - scale.min)) * 100;

const format = (value: number, scale: ScaleSpec) =>
  value.toFixed(Number.isInteger(scale.step) ? 0 : 1);

/** At most ~20 ticks, each a whole number of steps apart. */
const tickEvery = (scale: ScaleSpec) =>
  scale.step * Math.ceil((scale.max - scale.min) / scale.step / 20);

/** At most ten numerals under an axis, on a round interval. */
const numeralsFor = (scale: ScaleSpec) => {
  const span = scale.max - scale.min;
  const every =
    [1, 2, 5, 10, 20, 25, 50].find((n) => n >= scale.step && span / n <= 10) ??
    span;
  const out: number[] = [];
  for (let v = scale.min; v <= scale.max + 1e-9; v += every) out.push(v);
  return out;
};

type BandScaleProps = {
  /** Current estimated score, on `scale`. */
  value: number;
  /** Optional target, marked in the brand accent. */
  target?: number;
  /** The exam's ruler. IELTS's 0–9 when omitted. */
  scale?: ScaleSpec;
  /** Skill name — rendered by the `row` variant, used for labelling in all. */
  label?: string;
  variant?: 'axis' | 'row' | 'arrival';
  /**
   * `inverse` for use on a dark or saturated ground, where the default cobalt
   * fill would vanish into the background.
   */
  tone?: 'default' | 'inverse';
  /**
   * Draw the achieved span on scroll. Only for scales the reader scrolls
   * down to — one already in view on load starts mid-scrub and reads broken.
   */
  animate?: boolean;
  className?: string;
};

/**
 * The band scale. One 0–9 ruler, three presentations — it is the page's
 * signature and every appearance encodes a real value rather than decorating.
 *
 * Deliberately a server component: this is static presentation, so it carries
 * `role="meter"` and its ARIA attributes directly instead of pulling in Base
 * UI's Meter, which would add a client boundary for no behaviour.
 */
function BandScale({
  value,
  target,
  scale = IELTS_SCALE,
  label,
  variant = 'row',
  tone = 'default',
  animate = false,
  className,
}: BandScaleProps) {
  const fmt = (v: number) => format(v, scale);
  const noun = scale.label.toLowerCase();
  const valueText = target
    ? `${scale.label} ${fmt(value)} of ${fmt(scale.max)}, target ${noun} ${fmt(target)}`
    : `${scale.label} ${fmt(value)} of ${fmt(scale.max)}`;

  const inverse = tone === 'inverse';
  const tickColor = inverse ? 'var(--color-paper)' : 'var(--border)';

  const track = (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={scale.min}
      aria-valuemax={scale.max}
      aria-valuetext={valueText}
      aria-label={label ? `${label} ${noun} score` : `${scale.label} score`}
      className="relative h-9 w-full"
    >
      {/* Ticks along the scale — a gradient, not a DOM node per tick. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-3 h-2.5 opacity-60"
        style={{
          backgroundImage: `repeating-linear-gradient(to right, ${tickColor} 0 1px, transparent 1px calc(100% / ${(scale.max - scale.min) / tickEvery(scale)}))`,
        }}
      />
      {/* Baseline */}
      <div aria-hidden className="bg-border absolute inset-x-0 bottom-3 h-px" />
      {/* Achieved span */}
      <div
        aria-hidden
        className={cn(
          'absolute bottom-3 left-0 h-0.5',
          inverse ? 'bg-paper' : 'bg-cobalt',
          animate && 'bz-fill',
        )}
        style={{ width: `${pct(value, scale)}%` }}
      />
      {/* Target marker */}
      {target !== undefined && (
        <div
          aria-hidden
          className="absolute bottom-1.5 -translate-x-1/2"
          style={{ left: `${pct(target, scale)}%` }}
        >
          <div className="bg-chrome h-5 w-0.5" />
        </div>
      )}
      {/* Current marker */}
      <div
        aria-hidden
        className="absolute bottom-1 -translate-x-1/2"
        style={{ left: `${pct(value, scale)}%` }}
      >
        <div className={cn('h-6 w-1', inverse ? 'bg-paper' : 'bg-cobalt')} />
      </div>
    </div>
  );

  if (variant === 'row') {
    return (
      <div
        className={cn('grid grid-cols-[7rem_1fr_3rem] items-end', className)}
      >
        <span className="font-mono text-[0.6875rem] tracking-[0.18em] uppercase">
          {label}
        </span>
        {track}
        <span className="text-right font-mono text-sm tabular-nums">
          {fmt(value)}
        </span>
      </div>
    );
  }

  if (variant === 'arrival') {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        {track}
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[0.6875rem] tracking-[0.18em] uppercase">
            {label}
          </span>
          <span className="font-display text-display-3">
            {fmt(target ?? value)}
          </span>
        </div>
      </div>
    );
  }

  // axis — the hero. Full ruler with numerals along it.
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {track}
      <div
        aria-hidden
        className={cn(
          'relative h-4 font-mono text-[0.625rem] tabular-nums',
          inverse ? 'text-paper/70' : 'text-muted-foreground',
        )}
      >
        {numeralsFor(scale).map((n) => (
          <span
            key={n}
            className="absolute -translate-x-1/2"
            style={{ left: `${pct(n, scale)}%` }}
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

export { BandScale, pct as bandToPercent };
