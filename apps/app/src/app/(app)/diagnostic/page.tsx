import Link from 'next/link';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { Button } from '@bandzen/ui/components/button';
import { EmptyState } from '@/components/app/primitives';
import { requireUserId } from '@/lib/auth';
import {
  diagnosticCount,
  getProfile,
  isPro,
  latestDiagnostic,
} from '@/lib/db/queries';
import { canStartDiagnostic } from '@/lib/entitlements';
import { DIAGNOSTIC_DURATION_LABEL } from '@/lib/timing';
import { startDiagnostic } from './actions';

export const metadata = { title: 'Diagnostic' };

export default async function DiagnosticPage() {
  const userId = await requireUserId();
  const [profile, existing, taken, pro] = await Promise.all([
    getProfile(userId),
    latestDiagnostic(userId),
    diagnosticCount(userId),
    isPro(userId),
  ]);

  // The page asks the question the action asks, so the two cannot disagree.
  // It used to offer a live "Start the diagnostic" to a candidate who had
  // already spent theirs: the action correctly refused and redirected, and
  // from their side pressing Start silently landed them on an old result.
  const spent = existing != null && !canStartDiagnostic({ isPro: pro, taken });

  if (spent) {
    return (
      <div className="max-w-md space-y-8">
        <header>
          <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
            Diagnostic
          </p>
          <h1 className="mt-2 font-title text-title-lg">
            You have already been measured
          </h1>
        </header>

        <EmptyState
          title="One diagnostic on Free"
          description="Your result is still here, and every practice attempt you sit keeps your estimated band up to date. Pro re-measures whenever you want to."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href={`/diagnostic/${existing.id}/result`} />}
              >
                See your result
              </Button>
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href="/upgrade?from=diagnostic_wall" />}
              >
                Retake with Pro
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-8">
      <header>
        <p className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          Diagnostic · {DIAGNOSTIC_DURATION_LABEL}
        </p>
        <h1 className="mt-2 font-title text-title-lg">
          Find out where you actually are
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          One reading passage, then one Task 2 essay. You get an estimated band
          for each, your weakest area, and a study plan built from the result.
        </p>
      </header>

      <form action={startDiagnostic} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="targetBand">Target band</Label>
          <Input
            id="targetBand"
            name="targetBand"
            type="number"
            min={4}
            max={9}
            step={0.5}
            defaultValue={profile?.targetBand ?? 7}
            required
            className="font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="testDate">Test date</Label>
          <Input
            id="testDate"
            name="testDate"
            type="date"
            defaultValue={profile?.testDate ?? undefined}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Optional. Without one the plan runs a fortnight.
          </p>
        </div>

        <Button type="submit" size="lg" className="w-full">
          Start the diagnostic
        </Button>
      </form>

      <p className="text-xs leading-5 text-muted-foreground">
        Bands reported by Bandzen are estimates for practice, not official IELTS
        scores.
      </p>
    </div>
  );
}
