'use client';

import { useActionState, useSyncExternalStore } from 'react';
import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { ChoiceGroup } from '@/components/app/choice';
import { STUDY_MINUTE_CHOICES } from '@/lib/profile';
import { saveSettings, type SettingsState } from './actions';

const INITIAL: SettingsState = { error: null };

const BANDS = ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'];

const noopSubscribe = () => () => {};

function useTimezone() {
  return useSyncExternalStore(
    noopSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    () => '',
  );
}

type Props = {
  examType: 'academic' | 'general' | null;
  targetBand: number | null;
  testDate: string | null;
  selfAssessedBand: number | null;
  studyMinutes: number | null;
};

export function SettingsForm(props: Props) {
  const [state, action, pending] = useActionState(saveSettings, INITIAL);
  const timezone = useTimezone();

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="timezone" value={timezone} readOnly />

      <ChoiceGroup
        name="examType"
        legend="Exam"
        required
        defaultValue={props.examType ?? 'academic'}
        choices={[
          { value: 'academic', label: 'Academic' },
          { value: 'general', label: 'General Training' },
        ]}
      />

      <ChoiceGroup
        name="targetBand"
        legend="Target band"
        required
        columns={4}
        defaultValue={props.targetBand?.toFixed(1)}
        choices={BANDS.map((b) => ({ value: b, label: b }))}
      />

      <ChoiceGroup
        name="selfAssessedBand"
        legend="Your own estimate"
        columns={4}
        description="This is only your own guess. Your Estimated Band comes from the tests you sit, not from here."
        defaultValue={props.selfAssessedBand?.toFixed(1) ?? ''}
        choices={[
          { value: '', label: 'I don’t know' },
          ...BANDS.slice(0, 8).map((b) => ({ value: b, label: b })),
        ]}
      />

      <ChoiceGroup
        name="studyMinutes"
        legend="Daily study goal"
        required
        columns={4}
        defaultValue={String(props.studyMinutes ?? 45)}
        choices={STUDY_MINUTE_CHOICES.map((m) => ({
          value: String(m),
          label: `${m} min`,
        }))}
      />

      <div className="space-y-2">
        <Label htmlFor="testDate">
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            Exam date
          </span>
        </Label>
        <Input
          id="testDate"
          name="testDate"
          type="date"
          defaultValue={props.testDate ?? ''}
          className="w-full max-w-56"
        />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : state.saved ? (
          <p role="status" className="text-sm text-muted-foreground">
            Saved. Your plan has been recalculated.
          </p>
        ) : null}
      </div>
    </form>
  );
}
