import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import {
  EmptyState,
  InsightBar,
  Panel,
  Watermark,
} from '@/components/app/primitives';
import { ModuleBadge } from '@/components/app/status';
import type { PerformanceInsight as Insight } from '@/lib/insight';

/**
 * The biggest opportunity, and the evidence for calling it that.
 *
 * Every string on this card came out of the database — a grader's comment on
 * one criterion, or a measured accuracy on one question kind. The component
 * takes a typed `Insight`, so replacing the derivation with a model call later
 * changes nothing here.
 */
export function PerformanceInsight({ insight }: { insight: Insight | null }) {
  if (!insight) {
    return (
      <Panel title="Your biggest opportunity" headingId="insight-heading">
        <EmptyState
          title="Nothing to point at yet"
          description="Once you have finished a test we can name the one thing costing you the most marks, and show you why."
        />
      </Panel>
    );
  }

  return (
    <Panel
      title="Your biggest opportunity"
      headingId="insight-heading"
      className="relative isolate overflow-clip"
    >
      <Watermark text={insight.module} />
      <div className="flex items-baseline gap-2">
        <ModuleBadge module={insight.module} />
        <span aria-hidden className="text-muted-foreground">
          ·
        </span>
        <p className="text-sm font-medium">{insight.focus}</p>
      </div>

      <InsightBar className="mt-2 max-w-prose">{insight.summary}</InsightBar>

      {insight.evidence.length ? (
        <ul className="mt-3 space-y-0.5">
          {insight.evidence.map((line) => (
            <li
              key={line}
              className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase tabular-nums"
            >
              {line}
            </li>
          ))}
        </ul>
      ) : null}

      <Button
        variant="outline"
        size="sm"
        className="mt-4"
        nativeButton={false}
        render={<Link href={insight.action.href} />}
      >
        {insight.action.label}
        <ArrowRight />
      </Button>
    </Panel>
  );
}
