'use client';

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@bandzen/ui/components/button';
import { Input } from '@bandzen/ui/components/input';
import { Label } from '@bandzen/ui/components/label';
import { RadioCardGroup } from '@bandzen/ui/components/radio-card-group';
import { toast } from '@bandzen/ui/components/sonner';
import { STUDY_MINUTE_CHOICES } from '@/lib/profile';

/**
 * The one form behind both `/onboarding` and the Settings "Preparation" tab —
 * they asked the same questions in the same order and had drifted apart.
 *
 * `mode="settings"` shows every field at once with a save button.
 * `mode="onboarding"` walks the same fields one screen at a time, with a
 * progress indicator, back/next, and a "here's your plan" confirmation. The
 * fields are the shared part; the layout is not.
 */

type FormState = { error: string | null; saved?: boolean };

const BANDS = ['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0', '8.5', '9.0'];
const bandCards = BANDS.map((b) => ({ value: b, label: b }));

const noopSubscribe = () => () => {};
function useTimezone() {
  return useSyncExternalStore(
    noopSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    () => '',
  );
}

export type PreparationDefaults = {
  examType: 'academic' | 'general' | null;
  targetBand: number | null;
  testDate: string | null;
  selfAssessedBand: number | null;
  studyMinutes: number | null;
};

export function PreparationForm({
  mode,
  action,
  defaults,
  submitLabel,
}: {
  mode: 'onboarding' | 'settings';
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults: PreparationDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    { error: null },
  );
  const timezone = useTimezone();

  // A save toast, once per successful save.
  const notified = useRef(false);
  useEffect(() => {
    if (state.saved && !notified.current) {
      notified.current = true;
      toast.success('Saved. Your plan has been recalculated.');
    }
    if (!state.saved) notified.current = false;
  }, [state.saved]);

  const [examType, setExamType] = useState<string>(
    defaults.examType ?? 'academic',
  );
  const [targetBand, setTargetBand] = useState(
    defaults.targetBand?.toFixed(1) ?? '',
  );
  const [level, setLevel] = useState(
    defaults.selfAssessedBand?.toFixed(1) ?? '',
  );
  const [minutes, setMinutes] = useState(String(defaults.studyMinutes ?? 45));
  const [testDate, setTestDate] = useState(defaults.testDate ?? '');

  const examField = (
    <RadioCardGroup
      name="examType"
      legend={mode === 'settings' ? 'Exam' : 'Which test are you taking?'}
      value={examType}
      onValueChange={setExamType}
      required
      cards={[
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
  );

  const dateField = (
    <div className="space-y-2">
      <Label htmlFor="testDate">
        <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground uppercase">
          {mode === 'settings' ? 'Exam date' : 'When is your test?'}
        </span>
      </Label>
      <Input
        id="testDate"
        name="testDate"
        type="date"
        value={testDate}
        onChange={(e) => setTestDate(e.target.value)}
        className="w-full max-w-56"
      />
      <p className="text-xs text-muted-foreground">
        Optional. With a date your plan counts down to it; without one it runs a
        fortnight at a time.
      </p>
    </div>
  );

  const targetField = (
    <RadioCardGroup
      name="targetBand"
      legend={mode === 'settings' ? 'Target band' : 'What band do you need?'}
      value={targetBand}
      onValueChange={setTargetBand}
      required
      columns={5}
      cards={bandCards}
    />
  );

  const levelField = (
    <RadioCardGroup
      name="selfAssessedBand"
      legend={mode === 'settings' ? 'Your own estimate' : 'Where are you now?'}
      description={
        mode === 'settings'
          ? 'Only your own guess. Your Estimated Band comes from the tests you sit.'
          : 'A rough guess is fine — leave it on “I don’t know” and we’ll measure it.'
      }
      value={level}
      onValueChange={setLevel}
      columns={5}
      cards={[{ value: '', label: 'I don’t know' }, ...bandCards.slice(0, 8)]}
    />
  );

  const minutesField = (
    <RadioCardGroup
      name="studyMinutes"
      legend={
        mode === 'settings'
          ? 'Daily study goal'
          : 'How long can you study each day?'
      }
      value={minutes}
      onValueChange={setMinutes}
      required
      columns={5}
      cards={STUDY_MINUTE_CHOICES.map((m) => ({
        value: String(m),
        label: `${m} min`,
      }))}
    />
  );

  const hiddenTz = (
    <input type="hidden" name="timezone" value={timezone} readOnly />
  );

  if (mode === 'settings') {
    return (
      <form action={formAction} className="space-y-8">
        {hiddenTz}
        {examField}
        {targetField}
        {levelField}
        {minutesField}
        {dateField}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : submitLabel}
          </Button>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
        </div>
      </form>
    );
  }

  return (
    <Wizard
      formAction={formAction}
      pending={pending}
      error={state.error}
      submitLabel={submitLabel}
      timezoneInput={hiddenTz}
      steps={[
        { title: 'Which test, and when?', body: examField, extra: dateField },
        { title: 'What band do you need?', body: targetField },
        { title: 'Where are you now?', body: levelField },
        { title: 'How much time each day?', body: minutesField },
      ]}
      summary={[
        ['Exam', examType === 'academic' ? 'Academic' : 'General Training'],
        ['Target', targetBand ? `Band ${targetBand}` : '—'],
        ['Now', level ? `You estimated ${level}` : 'Not sure yet'],
        ['Time', `${minutes} min / day`],
        ['Exam date', testDate || 'Not set'],
      ]}
    />
  );
}

function Wizard({
  formAction,
  pending,
  error,
  submitLabel,
  timezoneInput,
  steps,
  summary,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  error: string | null;
  submitLabel: string;
  timezoneInput: React.ReactNode;
  steps: { title: string; body: React.ReactNode; extra?: React.ReactNode }[];
  summary: [string, string][];
}) {
  const [step, setStep] = useState(0);
  const last = steps.length; // the summary screen
  const onSummary = step === last;

  return (
    <form action={formAction} className="space-y-8">
      {timezoneInput}

      <ol className="flex items-center gap-0" aria-label="Progress">
        {[...steps, { title: 'Plan' }].map((_, i) => (
          <li key={i} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              className={
                'grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[0.625rem] ' +
                (i < step
                  ? 'border-primary bg-primary text-primary-foreground'
                  : i === step
                    ? 'border-foreground text-foreground'
                    : 'border-border text-muted-foreground')
              }
            >
              {i < step ? '✓' : i + 1}
            </span>
            {i < steps.length ? (
              <span className="h-px flex-1 bg-border" />
            ) : null}
          </li>
        ))}
      </ol>

      {/* Every field stays mounted so its value is in the form on submit; only
          the current step is shown. */}
      {steps.map((s, i) => (
        <div key={i} hidden={i !== step} className="space-y-6">
          <h2 className="font-title text-title-lg">{s.title}</h2>
          {s.body}
          {s.extra}
        </div>
      ))}

      <div hidden={!onSummary} className="space-y-6">
        <h2 className="font-title text-title-lg">Here’s your plan</h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6">
          {summary.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="border-t border-border py-2.5 font-mono text-[0.625rem] tracking-[0.16em] text-muted-foreground uppercase">
                {k}
              </dt>
              <dd className="border-t border-border py-2.5 text-sm">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground text-pretty">
          We’ll start with a diagnostic to replace your estimate with a measured
          band, then build a daily plan around your weakest skill.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Back
        </Button>
        {onSummary ? (
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? 'Saving…' : submitLabel}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setStep((s) => Math.min(last, s + 1))}
          >
            Next
            <ArrowRight />
          </Button>
        )}
      </div>
    </form>
  );
}
