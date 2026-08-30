import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { Button } from '@bandzen/ui/components/button';
import { requireUserId } from '@/lib/auth';
import { getProfile } from '@/lib/db/queries';
import { startDiagnostic } from './actions';

export const metadata = { title: 'Diagnostic' };

export default async function DiagnosticPage() {
  const userId = await requireUserId();
  const profile = await getProfile(userId);

  return (
    <div className="max-w-md space-y-8">
      <header>
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Diagnostic · about 35 minutes
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight">
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

      <p className="font-mono text-xs leading-5 text-muted-foreground">
        Bands reported by Bandzen are estimates for practice, not official IELTS
        scores.
      </p>
    </div>
  );
}
