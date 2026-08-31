import { BandScale } from '@bandzen/ui/components/band-scale';
import { SectionHeader } from '@/components/app/primitives';

/** Time-of-day greeting in the candidate's own zone, not the server's. */
function greeting(timezone: string | null | undefined): string {
  let hour = new Date().getUTCHours();
  if (timezone) {
    try {
      hour = Number(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: timezone,
          hour: '2-digit',
          hour12: false,
        }).format(new Date()),
      );
    } catch {
      // An unknown zone is not worth failing the page over.
    }
  }
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardHeader({
  firstName,
  timezone,
  estimated,
  target,
  daysUntilTest,
}: {
  firstName: string | null;
  timezone: string | null;
  estimated: number | null;
  target: number | null;
  daysUntilTest: number | null;
}) {
  return (
    <header className="space-y-5">
      <h1 className="text-2xl font-medium tracking-tight">
        {greeting(timezone)}
        {firstName ? `, ${firstName}` : ''}
      </h1>

      {/* items-start, so the three labels line up with each other. Aligning the
          bottoms instead pushes the label of the large figure out of the row. */}
      <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
        <div className="space-y-1">
          {/* "Estimated" is load-bearing: Bandzen scores are ours, not IELTS's. */}
          <SectionHeader as="p">Estimated Band</SectionHeader>
          <p className="font-metric text-metric-lg">
            {estimated != null ? estimated.toFixed(1) : '—'}
          </p>
        </div>

        {target != null ? (
          <div className="space-y-1">
            <SectionHeader as="p">Target</SectionHeader>
            <p className="font-metric text-metric">{target.toFixed(1)}</p>
          </div>
        ) : null}

        {daysUntilTest != null ? (
          <div className="space-y-1">
            <SectionHeader as="p">Test</SectionHeader>
            <p className="font-metric text-metric tabular-nums">
              {daysUntilTest > 0
                ? `${daysUntilTest} days`
                : daysUntilTest === 0
                  ? 'Today'
                  : 'Passed'}
            </p>
          </div>
        ) : null}
      </div>

      {estimated != null ? (
        <BandScale
          value={estimated}
          target={target ?? undefined}
          variant="axis"
        />
      ) : null}

      <p className="text-xs text-muted-foreground">
        An estimate produced by Bandzen, not an official IELTS score.
      </p>
    </header>
  );
}
