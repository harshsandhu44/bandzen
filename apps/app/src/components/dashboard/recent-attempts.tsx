import Link from 'next/link';
import { Panel } from '@/components/app/primitives';
import { MODULE_LABEL } from '@/lib/modules';
import type { Skill } from '@/lib/db/schema';

type Attempt = {
  id: string;
  module: Skill;
  kind: string;
  band: number | null;
};

/** Each attempt links to its own review or report surface. */
function reviewHref(a: Attempt): string {
  if (a.module === 'reading') return `/reading/${a.id}/review`;
  if (a.module === 'listening') return `/listening/${a.id}/review`;
  return `/writing/${a.id}/report`;
}

export function RecentAttempts({ attempts }: { attempts: Attempt[] }) {
  return (
    <Panel title="Recent attempts" headingId="recent-attempts">
      <ul className="-my-2.5 divide-y divide-border">
        {attempts.map((a) => (
          <li
            key={a.id}
            className="flex items-baseline justify-between gap-4 py-2.5"
          >
            <Link
              href={reviewHref(a)}
              className="text-sm underline-offset-4 hover:underline"
            >
              {MODULE_LABEL[a.module]}
              {a.kind === 'diagnostic' ? ' · diagnostic' : ''}
            </Link>
            <span className="font-metric text-metric-sm">
              {a.band?.toFixed(1)}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
