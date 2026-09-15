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
import { EXAMS, getExam, targetChoices } from '@bandzen/exams/registry';
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

const EXAM_HINT: Record<string, string> = {
  ielts: 'Academic or General Training',
  pte_academic: 'Pearson, computer-based',
  toefl_ibt: 'ETS, the 2026 format',
  det: 'Online and adaptive, about an hour',
};

const VARIANT_HINT: Record<string, string> = {
  academic: 'University and professional registration',
  general: 'Migration and work experience',
};

/** An exam's score choices as the strings the cards carry ("7.0", "79"). */
function choicesFor(examKey: string) {
  const exam = getExam(examKey) ?? getExam('ielts')!;
  const decimals = Number.isInteger(exam.scoreScale.step) ? 0 : 1;
  const fmt = (n: number) => n.toFixed(decimals);
  return { exam, fmt, values: targetChoices(exam).map(fmt) };
}

export type EnrollmentDefaults = {
  examKey: string;
  examVariant: string | null;
  targetScore: number | null;
  testDate: string | null;
};

const noopSubscribe = () => () => {};
function useTimezone() {
  return useSyncExternalStore(
    noopSubscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone ?? '',
    () => '',
  );
}

export type PreparationDefaults = {
  examKey: string | null;
  examVariant: string | null;
  targetScore: number | null;
  testDate: string | null;
  selfAssessedScore: number | null;
  studyMinutes: number | null;
};

export function PreparationForm({
  mode,
  action,
  defaults,
  submitLabel,
  enrollments = [],
  withContent,
}: {
  mode: 'onboarding' | 'settings';
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaults: PreparationDefaults;
  submitLabel: string;
  /** Exams already set up, so switching back refills their answers. */
  enrollments?: readonly EnrollmentDefaults[];
  /** Exams with practice content, which decides what onboarding promises. */
  withContent: readonly string[];
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

  const initial = choicesFor(defaults.examKey ?? 'ielts');
  const [examKey, setExamKey] = useState<string>(initial.exam.key);
  const [examType, setExamType] = useState<string>(
    defaults.examVariant ?? 'academic',
  );
  const [targetBand, setTargetBand] = useState(
    defaults.targetScore != null ? initial.fmt(defaults.targetScore) : '',
  );
  const [level, setLevel] = useState(
    defaults.selfAssessedScore != null
      ? initial.fmt(defaults.selfAssessedScore)
      : '',
  );
  const [minutes, setMinutes] = useState(String(defaults.studyMinutes ?? 45));
  const [testDate, setTestDate] = useState(defaults.testDate ?? '');

  const { exam, values } = choicesFor(examKey);
  const noun = exam.scoreScale.label.toLowerCase();
  const scoreCards = values.map((v) => ({ value: v, label: v }));

  // A target means nothing on another exam's scale, so changing exam clears
  // it — unless this exam is already set up, in which case its answers return.
  const changeExam = (key: string) => {
    setExamKey(key);
    const next = choicesFor(key);
    const saved = enrollments.find((e) => e.examKey === key);
    setTargetBand(
      saved?.targetScore != null ? next.fmt(saved.targetScore) : '',
    );
    setLevel('');
    if (saved) {
      setExamType(saved.examVariant ?? 'academic');
      setTestDate(saved.testDate ?? '');
    }
  };

  const examField = (
    <RadioCardGroup
      name="examKey"
      legend={mode === 'settings' ? 'Exam' : 'Which test are you taking?'}
      value={examKey}
      onValueChange={changeExam}
      required
      cards={EXAMS.map((e) => ({
        value: e.key,
        label: e.name,
        hint: EXAM_HINT[e.key],
      }))}
    />
  );

  // Only an exam with variants asks for one; the field is absent otherwise,
  // so a PTE enrollment never carries an IELTS variant.
  const variantField = exam.variants.length ? (
    <RadioCardGroup
      name="examVariant"
      legend={`Which ${exam.name}?`}
      value={examType}
      onValueChange={setExamType}
      required
      cards={exam.variants.map((v) => ({
        value: v.key,
        label: v.label,
        hint: VARIANT_HINT[v.key],
      }))}
    />
  ) : null;

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
      name="targetScore"
      legend={
        mode === 'settings' ? `Target ${noun}` : `What ${noun} do you need?`
      }
      value={targetBand}
      onValueChange={setTargetBand}
      required
      columns={5}
      cards={scoreCards}
    />
  );

  const levelField = (
    <RadioCardGroup
      name="selfAssessedScore"
      legend={mode === 'settings' ? 'Your own estimate' : 'Where are you now?'}
      description={
        mode === 'settings'
          ? `Only your own guess. Your estimated ${noun} comes from the tests you sit.`
          : 'A rough guess is fine — leave it on “I don’t know” and we’ll measure it.'
      }
      value={level}
      onValueChange={setLevel}
      columns={5}
      cards={[{ value: '', label: 'I don’t know' }, ...scoreCards.slice(0, -1)]}
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
        {variantField}
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
        {
          title: 'Which test, and when?',
          body: (
            <>
              {examField}
              {variantField}
            </>
          ),
          extra: dateField,
        },
        { title: `What ${noun} do you need?`, body: targetField },
        { title: 'Where are you now?', body: levelField },
        { title: 'How much time each day?', body: minutesField },
      ]}
      closing={
        withContent.includes(examKey)
          ? `We’ll start with a diagnostic to replace your estimate with a measured ${noun}, then build a daily plan around your weakest skill.`
          : `Bandzen does not have ${exam.name} practice yet. We’ll save your target and date, and your dashboard will say plainly what is ready and what is not.`
      }
      summary={[
        [
          'Exam',
          exam.variants.length
            ? `${exam.name} ${exam.variants.find((v) => v.key === examType)?.label ?? ''}`
            : exam.name,
        ],
        ['Target', targetBand ? `${exam.scoreScale.label} ${targetBand}` : '—'],
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
  closing,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  error: string | null;
  submitLabel: string;
  timezoneInput: React.ReactNode;
  steps: { title: string; body: React.ReactNode; extra?: React.ReactNode }[];
  summary: [string, string][];
  closing: string;
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
        <p className="text-sm text-muted-foreground text-pretty">{closing}</p>
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
