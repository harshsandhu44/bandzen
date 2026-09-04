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
import { toast, toastResult } from '@/components/toast';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';
import { savePassageAction } from '../actions';
import {
  QUESTION_KINDS,
  passageFormSchema,
  toSave,
  type PassageFormValues,
} from './schema';

const KIND_LABEL: Record<(typeof QUESTION_KINDS)[number], string> = {
  true_false_not_given: 'True / False / Not Given',
  yes_no_not_given: 'Yes / No / Not Given',
  multiple_choice: 'Multiple choice',
  matching_headings: 'Matching headings',
  sentence_completion: 'Sentence completion',
};

const blankQuestion = (idx: number): PassageFormValues['questions'][number] => ({
  idx,
  kind: 'true_false_not_given',
  prompt: '',
  optionsText: '',
  answerText: '',
  evidence: '',
  explanation: '',
});

export function PassageEditor({
  id,
  defaults,
}: {
  id: string;
  defaults: PassageFormValues;
}) {
  const [saving, startSaving] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm<PassageFormValues>({
    resolver: zodResolver(passageFormSchema),
    defaultValues: defaults,
  });

  useUnsavedGuard(isDirty);

  const questions = useFieldArray({ control, name: 'questions' });

  const onSubmit = (values: PassageFormValues) => {
    startSaving(async () => {
      const result = await savePassageAction(toSave(id, values));
      toastResult(result);
      if (result.ok) reset(values);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, () => toast.error("Some fields need fixing — check the form."))} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Passage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Title" required error={errors.title?.message}>
            <Input {...register('title')} />
          </Field>
          <Field label="Topic" error={errors.topic?.message}>
            <Input {...register('topic')} />
          </Field>
          <div className="flex flex-wrap gap-4">
            <Field label="Format" className="w-40">
              <Select {...register('format')}>
                <option value="academic">Academic</option>
                <option value="general">General</option>
              </Select>
            </Field>
            <Field
              label="Difficulty"
              hint="1 easiest – 5 hardest"
              className="w-32"
              error={errors.difficulty?.message}
            >
              <Input type="number" min={1} max={5} {...register('difficulty', { valueAsNumber: true })} />
            </Field>
          </div>
          <Field label="Body" required error={errors.body?.message}>
            <Textarea className="min-h-64" {...register('body')} />
          </Field>
          <Field
            label="Headings"
            hint="One per line. The shared list every matching-headings question draws from."
          >
            <Textarea className="min-h-24" {...register('headingsText')} />
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
          {questions.fields.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No questions yet. A passage needs at least one to publish.
            </p>
          ) : null}

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
                        {KIND_LABEL[k]}
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
              <Field
                label="Options"
                hint="One per line — multiple choice only."
              >
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
              <Field
                label="Answer"
                hint="Comma-separated. Usually one; add more only for genuine synonyms."
              >
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
