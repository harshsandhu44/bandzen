'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@bandzen/ui/components/chart';
import type { ScaleSpec } from '@bandzen/ui/components/band-scale';

/**
 * Estimated score across every completed attempt, oldest first, on one exam's
 * scale — never a mix of scales. Replaces the hand-drawn `BandTrend` on the
 * Progress hero with the shadcn `chart` (Recharts) — themed off `--chart-1` so
 * it follows the `.dark` swap.
 */
export function ScoreChart({
  points,
  target,
  scale,
}: {
  points: { label: string; value: number }[];
  target?: number;
  scale: ScaleSpec;
}) {
  const config = {
    score: {
      label: `Estimated ${scale.label.toLowerCase()}`,
      color: 'var(--chart-1)',
    },
  } satisfies ChartConfig;
  const fmt = (v: number) => v.toFixed(Number.isInteger(scale.step) ? 0 : 1);
  const data = points.map((p, i) => ({
    i: i + 1,
    score: p.value,
    label: p.label,
  }));
  // Two steps of headroom either side, inside the scale.
  const lo = Math.max(
    scale.min,
    Math.floor(Math.min(...points.map((p) => p.value)) - scale.step * 2),
  );
  const hi = Math.min(
    scale.max,
    Math.ceil(Math.max(...points.map((p) => p.value)) + scale.step * 2),
  );

  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="i" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          domain={[lo, hi]}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={40}
        />
        {target != null ? (
          <ReferenceLine
            y={target}
            stroke="var(--chart-2)"
            strokeDasharray="4 3"
            label={{
              value: `Target ${fmt(target)}`,
              position: 'insideTopRight',
              fontSize: 10,
              fill: 'var(--muted-foreground)',
            }}
          />
        ) : null}
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                payload?.[0]?.payload?.label ?? ''
              }
            />
          }
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--color-score)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: 'var(--background)', strokeWidth: 2 }}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
