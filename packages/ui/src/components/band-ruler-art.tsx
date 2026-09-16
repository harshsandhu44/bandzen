import { cn } from '@bandzen/ui/lib/utils';
import { IELTS_SCALE } from '@bandzen/ui/components/band-scale';

/**
 * The picture beside the sign-in and sign-up forms: the band ruler every score
 * screen draws, at poster scale. A fill has climbed to 6.0, the target sits at
 * 7.5, and the space between them is left empty on purpose. That gap is the
 * whole pitch, so nothing is drawn in it.
 *
 * Decoration only, hence `aria-hidden`. Every colour is a token utility, so the
 * CMS's plum `--primary` and `--tick` recolour it with no variant: the target
 * uses `--tick` rather than `--chrome`, which the CMS reserves for "unpublished".
 *
 * The rules and the fill overshoot the viewBox to the right and bottom.
 * `xMinYMid meet` pins the numerals to the panel's left edge and always fits
 * the whole 0–9 range in its height, while the drawing bleeds off the right
 * like a poster, whatever the panel's proportions.
 *
 * The fill rises once on load. That is the one motion here, the same gesture
 * as the band-score reveal on a report, and reduced motion gets the final frame.
 */
const TOP = 90;
const UNIT = 90; // viewBox units per band
const LEFT = 96; // where the rules start; numerals sit just left of it
const BLEED = 2400;
const NOW = 6;
const TARGET = 7.5;

const y = (band: number) => TOP + (IELTS_SCALE.max - band) * UNIT;

const bands = Array.from(
  { length: (IELTS_SCALE.max - IELTS_SCALE.min) / IELTS_SCALE.step + 1 },
  (_, i) => IELTS_SCALE.min + i * IELTS_SCALE.step,
);

function Rules({ className }: { className: string }) {
  return (
    <g className={className}>
      {bands.map((band) => {
        const whole = Number.isInteger(band);
        return (
          <line
            key={band}
            x1={LEFT}
            x2={whole ? BLEED : LEFT + 220}
            y1={y(band)}
            y2={y(band)}
            strokeWidth={whole ? 3 : 2}
          />
        );
      })}
    </g>
  );
}

export function BandRulerArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 1000"
      preserveAspectRatio="xMinYMid meet"
      aria-hidden
      focusable="false"
      className={cn('overflow-hidden', className)}
    >
      <style>{`
        .bz-rise {
          transform-box: view-box;
          transform-origin: 50% 100%;
          animation: bz-rise 900ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
        }
        @keyframes bz-rise { from { transform: scaleY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .bz-rise { animation: none; }
        }
      `}</style>

      <defs>
        <clipPath id="bz-ruler-fill">
          <rect
            className="bz-rise"
            x={LEFT}
            y={y(NOW)}
            width={BLEED}
            height={BLEED}
          />
        </clipPath>
      </defs>

      <Rules className="stroke-foreground/15" />

      {bands.filter(Number.isInteger).map((band) => (
        <text
          key={band}
          x={LEFT - 24}
          y={y(band)}
          textAnchor="end"
          dominantBaseline="central"
          className="fill-muted-foreground font-mono text-[26px]"
        >
          {band}
        </text>
      ))}

      <rect
        className="bz-rise fill-primary"
        x={LEFT}
        y={y(NOW)}
        width={BLEED}
        height={BLEED}
      />
      {/* The ruler keeps reading through the fill, knocked out of it. */}
      <g clipPath="url(#bz-ruler-fill)">
        <Rules className="stroke-primary-foreground/35" />
      </g>

      <rect
        className="fill-tick"
        x={LEFT}
        y={y(TARGET) - 6}
        width={BLEED}
        height={12}
      />
    </svg>
  );
}
