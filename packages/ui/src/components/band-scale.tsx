import { cn } from '@bandzen/ui/lib/utils';

const MIN = 0;
const MAX = 9;

/** Position of a band on the 0–9 ruler, as a percentage. */
const pct = (band: number) => ((band - MIN) / (MAX - MIN)) * 100;

const fmt = (band: number) => band.toFixed(1);

type BandScaleProps = {
  /** Current estimated band, 0–9. */
  value: number;
  /** Optional target band, marked in the brand accent. */
  target?: number;
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
  label,
  variant = 'row',
  tone = 'default',
  animate = false,
  className,
}: BandScaleProps) {
  const valueText = target
    ? `Band ${fmt(value)} of 9, target band ${fmt(target)}`
    : `Band ${fmt(value)} of 9`;

  const inverse = tone === 'inverse';
  const tickColor = inverse ? 'var(--color-paper)' : 'var(--border)';

  const track = (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={MIN}
      aria-valuemax={MAX}
      aria-valuetext={valueText}
      aria-label={label ? `${label} band score` : 'Band score'}
      className="relative h-9 w-full"
    >
      {/* Ticks every 0.5 band — a gradient, not 19 DOM nodes. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-3 h-2.5 opacity-60"
        style={{
          backgroundImage: `repeating-linear-gradient(to right, ${tickColor} 0 1px, transparent 1px calc(100% / 18))`,
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
        style={{ width: `${pct(value)}%` }}
      />
      {/* Target marker */}
      {target !== undefined && (
        <div
          aria-hidden
          className="absolute bottom-1.5 -translate-x-1/2"
          style={{ left: `${pct(target)}%` }}
        >
          <div className="bg-chrome h-5 w-0.5" />
        </div>
      )}
      {/* Current marker */}
      <div
        aria-hidden
        className="absolute bottom-1 -translate-x-1/2"
        style={{ left: `${pct(value)}%` }}
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

  // axis — the hero. Full ruler with whole-band numerals.
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
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((band) => (
          <span
            key={band}
            className="absolute -translate-x-1/2"
            style={{ left: `${pct(band)}%` }}
          >
            {band}
          </span>
        ))}
      </div>
    </div>
  );
}

export { BandScale, pct as bandToPercent };
