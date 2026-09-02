import type { ReactNode } from 'react';

import { AWARDS, READING_BANDS } from '@/content/facts';

/**
 * The two tables built from `facts.ts` rather than written as markdown.
 *
 * Both hold values `facts.test.ts` checks against `apps/app`'s own source. A
 * markdown table would be a second copy of each, and the copy the test could
 * not see — which is exactly the drift the test exists to catch.
 *
 * The cell styling repeats what `mdx-components.tsx` gives markdown tables:
 * MDX's component map only rewrites elements generated from markdown, so
 * literal JSX does not pass through it.
 */

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm tabular-nums">
        <thead>
          <tr>
            {head.map((label) => (
              <th
                key={label}
                className="border-b border-border pr-6 pb-2 font-mono text-[0.6875rem] font-medium tracking-[0.18em] text-muted-foreground uppercase"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children }: { children: ReactNode }) {
  return (
    <td className="border-b border-border py-2.5 pr-6 align-top">{children}</td>
  );
}

/** Reading raw score → band, from `readingBand()`. */
export function BandTable() {
  return (
    <Table head={['Raw score, scaled to 40', 'Band']}>
      {READING_BANDS.map((row) => (
        <tr key={row.band}>
          <Td>{row.from === 0 ? 'Below 6' : `${row.from} or more`}</Td>
          <Td>{row.band}</Td>
        </tr>
      ))}
    </Table>
  );
}

/** The award catalogue, with the requirement text the product itself shows. */
export function AwardTable() {
  return (
    <Table head={['Award', 'Requirement']}>
      {AWARDS.map((award) => (
        <tr key={award.id}>
          <Td>{award.name}</Td>
          <Td>{award.requirement}</Td>
        </tr>
      ))}
    </Table>
  );
}
