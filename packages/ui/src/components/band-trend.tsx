import { cn } from '@bandzen/ui/lib/utils';

const MIN = 0;
const MAX = 9;

export type BandPoint = {
  /** Band achieved, 0–9. */
  value: number;
  /** Short label for the axis and the table fallback. */
  label: string;
};

type BandTrendProps = {
  points: readonly BandPoint[];
  /** Target band, marked in the brand accent, as on BandScale. */
  target?: number;
  /** Names what is being tracked, for the accessible table. */
  caption: string;
  className?: string;
};

/**
 * Band over time. The sibling of BandScale, on the same 0–9 ruler.
 *
 * Hand-drawn SVG rather than a chart library: this is one polyline and a few
 * circles, and pulling in a client-only charting runtime for it would put the
 * app's only hydration boundary on the page that needs it least. Server
 * component, no JavaScript at all.
 *
 * The figures are also rendered as a real table, visually hidden. A polyline
 * with an aria-label tells a screen reader that a chart exists; a table tells
 * it what the numbers are.
 */
function BandTrend({ points, target, caption, className }: BandTrendProps) {
  // A single measurement is a dot, not a trend -- but it still draws, because
  // "your first result" is worth showing.
  if (!points.length) return null;

  const width = 100;
  const height = 34;
  const pad = 2;

  const x = (i: number) =>
    points.length === 1
      ? width / 2
      : pad + (i / (points.length - 1)) * (width - pad * 2);

  const y = (band: number) =>
    height - pad - ((band - MIN) / (MAX - MIN)) * (height - pad * 2);

  const path = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const delta = last.value - first.value;

  return (
    <figure className={cn('space-y-2', className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="presentation"
        aria-hidden
        className="h-32 w-full"
      >
        {/* Band gridlines at 5, 6, 7, 8 -- the range every candidate lives in. */}
        {[5, 6, 7, 8].map((band) => (
          <line
            key={band}
            x1={0}
            x2={width}
            y1={y(band)}
            y2={y(band)}
            stroke="var(--border)"
            strokeWidth={0.25}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {target != null ? (
          <line
            x1={0}
            x2={width}
            y1={y(target)}
            y2={y(target)}
            stroke="var(--color-chrome)"
            strokeWidth={1}
            strokeDasharray="3 2"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {points.length > 1 ? (
          <polyline
            points={path}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.value)}
            r={1.6}
            fill="var(--background)"
            stroke="var(--primary)"
            strokeWidth={1.25}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <figcaption className="flex items-baseline justify-between gap-4">
        <span className="font-mono text-[0.625rem] tracking-[0.2em] text-muted-foreground uppercase">
          {caption}
        </span>
        <span className="font-mono text-[0.625rem] tracking-[0.2em] uppercase tabular-nums">
          {first.value.toFixed(1)} → {last.value.toFixed(1)}
          {delta !== 0 ? (
            <span className="text-muted-foreground">
              {' '}
              ({delta > 0 ? '+' : ''}
              {delta.toFixed(1)})
            </span>
          ) : null}
        </span>
      </figcaption>

      {/* The numbers themselves, for anyone who cannot see the line. */}
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Attempt</th>
            <th scope="col">Estimated band</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={i}>
              <th scope="row">{p.label}</th>
              <td>{p.value.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export { BandTrend };
