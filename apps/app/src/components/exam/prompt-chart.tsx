import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@bandzen/ui/components/chart';
import type { WritingChartData } from '@bandzen/db/schema';

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

type Series = { name: string; points: [number | string, number][] };
type Normalized = { isBar: boolean; xLabel?: string; series: Series[] };

/**
 * `WritingChartData` is two shapes — see the type's own comment for why.
 * Both normalize to the same `{name, points}[]` this component actually
 * draws from, so the render logic below only has to know one shape.
 */
function normalize(data: WritingChartData): Normalized {
  if ('kind' in data) {
    return {
      isBar: data.kind === 'bar',
      xLabel: data.xLabel,
      series: data.series,
    };
  }
  // `categories`/`values`: an array of values pairs positionally with
  // `categories`; an object (pie's shape) is already its own category->value
  // map. Pie renders as a bar for now — see the type's doc comment.
  const series = data.series.map((s) => ({
    name: s.name,
    points: Array.isArray(s.values)
      ? s.values.map((v, i): [string | number, number] => [
          data.categories?.[i] ?? i + 1,
          v,
        ])
      : Object.entries(s.values),
  }));
  return { isBar: true, series };
}

/**
 * Task 1's figure — a recharts line or bar chart, themed like every other
 * chart in the app (`ChartContainer`, `--chart-N`). Series get a `sN` key
 * rather than their own name: a name like "United Kingdom" is a fine chart
 * label but not a legal CSS custom-property suffix.
 */
export function PromptChart({ data }: { data: WritingChartData }) {
  const { isBar, xLabel, series } = normalize(data);
  const keys = series.map((_, i) => `s${i}`);
  const config = Object.fromEntries(
    series.map((s, i) => [
      keys[i],
      { label: s.name, color: COLORS[i % COLORS.length] },
    ]),
  ) satisfies ChartConfig;

  if (!series.every((s) => Array.isArray(s.points) && s.points.length)) {
    // Content that doesn't parse into a drawable series — the prompt text
    // still stands on its own, so say nothing rather than crash the section.
    return null;
  }

  // One row per x value, each series contributing its own key.
  const rows = new Map<string | number, Record<string, string | number>>();
  series.forEach((s, i) => {
    for (const [x, y] of s.points) {
      const row = rows.get(x) ?? { x };
      row[keys[i]] = y;
      rows.set(x, row);
    }
  });
  const chartData = [...rows.values()];

  const Chart = isBar ? BarChart : LineChart;

  return (
    <div className="border-l-2 border-chrome pl-4">
      <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
        {data.title}
        {data.unit ? ` — ${data.unit}` : ''}
      </p>
      <ChartContainer config={config} className="mt-3 aspect-auto h-64 w-full">
        <Chart
          data={chartData}
          margin={{ top: 8, right: 8, bottom: xLabel ? 16 : 0, left: -16 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="x"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            label={
              xLabel
                ? {
                    value: xLabel,
                    position: 'insideBottom',
                    offset: -8,
                    fontSize: 10,
                  }
                : undefined
            }
          />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {keys.map((key) =>
            isBar ? (
              <Bar
                key={key}
                dataKey={key}
                fill={`var(--color-${key})`}
                radius={2}
              />
            ) : (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            ),
          )}
        </Chart>
      </ChartContainer>
    </div>
  );
}
