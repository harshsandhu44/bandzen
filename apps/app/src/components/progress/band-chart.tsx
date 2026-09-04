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

const config = {
  band: { label: 'Estimated band', color: 'var(--chart-1)' },
} satisfies ChartConfig;

/**
 * Estimated band across every completed attempt, oldest first. Replaces the
 * hand-drawn `BandTrend` on the Progress hero with the shadcn `chart`
 * (Recharts) — themed off `--chart-1` so it follows the `.dark` swap.
 */
export function BandChart({
  points,
  target,
}: {
  points: { label: string; value: number }[];
  target?: number;
}) {
  const data = points.map((p, i) => ({
    i: i + 1,
    band: p.value,
    label: p.label,
  }));
  const lo = Math.max(
    0,
    Math.floor(Math.min(...points.map((p) => p.value)) - 1),
  );
  const hi = Math.min(
    9,
    Math.ceil(Math.max(...points.map((p) => p.value)) + 1),
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
              value: `Target ${target.toFixed(1)}`,
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
          dataKey="band"
          stroke="var(--color-band)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: 'var(--background)', strokeWidth: 2 }}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
