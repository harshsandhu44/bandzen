import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Panel } from '@/components/app/primitives';
import { ProTag } from '@/components/billing/pro';

/**
 * The starts a candidate reaches for often enough that the nav is a detour.
 *
 * Actions, not destinations — the sidebar already lists the sections. Speaking
 * carries the Pro mark for a free candidate and points at the wall rather than
 * a dead end, the same vocabulary `pro.tsx` uses everywhere else.
 */
const LINKS = [
  { href: '/reading', label: 'Reading practice' },
  { href: '/listening', label: 'Listening practice' },
  { href: '/diagnostic', label: 'Sit a diagnostic' },
  { href: '/coach', label: 'Ask Coach' },
  { href: '/resources', label: 'Guides' },
] as const;

function Row({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-3 py-2.5 text-sm underline-offset-4 hover:underline"
      >
        <span className="flex items-center gap-2">{children}</span>
        <ArrowRight
          className="size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </Link>
    </li>
  );
}

export function QuickLinks({ pro }: { pro: boolean }) {
  return (
    <Panel title="Quick links" headingId="quick-links">
      <ul className="-my-2.5 divide-y divide-border">
        {LINKS.map((l) => (
          <Row key={l.href} href={l.href}>
            {l.label}
          </Row>
        ))}
        {pro ? (
          <Row href="/speaking">Speaking practice</Row>
        ) : (
          <Row href="/upgrade?from=dashboard_quicklinks">
            Speaking practice <ProTag />
          </Row>
        )}
      </ul>
    </Panel>
  );
}
