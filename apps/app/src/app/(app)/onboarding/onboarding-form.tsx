'use client';

import { useActionState, useSyncExternalStore } from 'react';
import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { ChoiceGroup } from '@/components/app/choice';
import { STUDY_MINUTE_CHOICES } from '@/lib/profile';
import { saveOnboarding, type OnboardingState } from './actions';

const INITIAL: OnboardingState = { error: null };

const BANDS = ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'];

const noopSubscribe = () => () => {};

/**
 * The browser's zone, so "today" on the dashboard means their today.
 *
 * The server cannot know it, so this uses the same explicit server/client
 * snapshot pair as ThemeToggle rather than a mount effect — no extra render,
 * no hydration mismatch on the hidden input.
 */
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
  /** Onboarding stamps a completion time; settings must not. */
  submitLabel: string;
};

export function OnboardingForm(props: Props) {
  const [state, action, pending] = useActionState(saveOnboarding, INITIAL);

  const timezone = useTimezone();

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="timezone" value={timezone} readOnly />

      <ChoiceGroup
        name="examType"
        legend="Which test are you taking?"
        required
        defaultValue={props.examType ?? 'academic'}
        choices={[
          {
            value: 'academic',
            label: 'Academic',
            hint: 'University and professional registration',
          },
          {
            value: 'general',
            label: 'General Training',
            hint: 'Migration and work experience',
          },
        ]}
      />

      <ChoiceGroup
        name="targetBand"
        legend="What band do you need?"
        required
        columns={4}
        defaultValue={props.targetBand?.toFixed(1)}
        choices={BANDS.map((b) => ({ value: b, label: b }))}
      />

      <ChoiceGroup
        name="selfAssessedBand"
        legend="Where are you now?"
        columns={4}
        description="A rough guess is fine. Leave it on “I don’t know” and we’ll measure it instead."
        defaultValue={props.selfAssessedBand?.toFixed(1) ?? ''}
        choices={[
          { value: '', label: 'I don’t know' },
          ...BANDS.slice(0, 8).map((b) => ({ value: b, label: b })),
        ]}
      />

      <ChoiceGroup
        name="studyMinutes"
        legend="How long can you study each day?"
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
          <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
            When is your test?
          </span>
        </Label>
        <Input
          id="testDate"
          name="testDate"
          type="date"
          defaultValue={props.testDate ?? ''}
          className="w-full max-w-56"
        />
        <p className="text-xs text-muted-foreground">
          Optional. With a date your plan counts down to it; without one it runs
          a fortnight at a time.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Saving…' : props.submitLabel}
      </Button>
    </form>
  );
}
