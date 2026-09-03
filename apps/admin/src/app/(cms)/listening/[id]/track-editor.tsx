'use client';

import { useTransition } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@bandzen/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@bandzen/ui/components/card';
import { Field } from '@bandzen/ui/components/field';
import { Input } from '@bandzen/ui/components/input';
import { Select } from '@bandzen/ui/components/select';
import { Textarea } from '@bandzen/ui/components/textarea';
import { SaveBar } from '@/components/editor-shell';
import { toastResult } from '@/components/toast';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';
import { saveTrackAction } from '../actions';
import {
  QUESTION_KINDS,
  trackFormSchema,
  toSave,
  type TrackFormValues,
} from './schema';

const blankQuestion = (idx: number): TrackFormValues['questions'][number] => ({
  idx,
  kind: 'multiple_choice',
  prompt: '',
  optionsText: '',
  answerText: '',
  evidence: '',
  explanation: '',
});

export function TrackEditor({
  id,
  defaults,
}: {
  id: string;
  defaults: TrackFormValues;
}) {
  const [saving, startSaving] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm<TrackFormValues>({
    resolver: zodResolver(trackFormSchema),
    defaultValues: defaults,
  });
  useUnsavedGuard(isDirty);
  const questions = useFieldArray({ control, name: 'questions' });

  const onSubmit = (values: TrackFormValues) => {
    startSaving(async () => {
      const result = await saveTrackAction(toSave(id, values));
      toastResult(result);
      if (result.ok) reset(values);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Track</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Title" required error={errors.title?.message}>
            <Input {...register('title')} />
          </Field>
          <div className="flex flex-wrap gap-4">
            <Field label="Topic" className="min-w-56 flex-1">
              <Input {...register('topic')} />
            </Field>
            <Field label="Difficulty" hint="1–5" className="w-28">
              <Input
                type="number"
                min={1}
                max={5}
                {...register('difficulty', { valueAsNumber: true })}
              />
            </Field>
          </div>
          <Field
            label="Transcript"
            hint="The answer key. Grading and every question's evidence are matched against it verbatim — proofread a generated one before publishing."
          >
            <Textarea className="min-h-64" {...register('transcriptText')} />
          </Field>
          <Field
            label="Matching options"
            hint="One per line — the shared list every matching question draws its answer from."
          >
            <Textarea
              className="min-h-24"
              {...register('matchingOptionsText')}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>Questions ({questions.fields.length})</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              questions.append(blankQuestion(questions.fields.length + 1))
            }
          >
            Add question
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.fields.map((field, i) => (
            <fieldset
              key={field.id}
              className="space-y-3 border-b border-border pb-5 last:border-0 last:pb-0"
            >
              <legend className="sr-only">Question {i + 1}</legend>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Idx" className="w-16">
                  <Input
                    type="number"
                    min={1}
                    {...register(`questions.${i}.idx`, { valueAsNumber: true })}
                  />
                </Field>
                <Field label="Kind" className="min-w-56 flex-1">
                  <Select {...register(`questions.${i}.kind`)}>
                    {QUESTION_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => questions.remove(i)}
                >
                  Remove
                </Button>
              </div>
              <Field
                label="Prompt"
                required
                error={errors.questions?.[i]?.prompt?.message}
              >
                <Textarea {...register(`questions.${i}.prompt`)} />
              </Field>
              <Field label="Options" hint="One per line — multiple choice only.">
                <Textarea
                  className="min-h-16"
                  {...register(`questions.${i}.optionsText`)}
                />
              </Field>
              <div className="flex flex-wrap gap-3">
                <Field label="Evidence" className="min-w-56 flex-1">
                  <Input {...register(`questions.${i}.evidence`)} />
                </Field>
                <Field label="Explanation" className="min-w-56 flex-1">
                  <Input {...register(`questions.${i}.explanation`)} />
                </Field>
              </div>
              <Field label="Answer" hint="Comma-separated.">
                <Input {...register(`questions.${i}.answerText`)} />
              </Field>
            </fieldset>
          ))}
        </CardContent>
      </Card>

      <SaveBar dirty={isDirty} saving={saving} />
    </form>
  );
}
