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
import { saveSpeakingTestAction } from '../actions';
import {
  PART_TITLE,
  speakingFormSchema,
  toSave,
  type SpeakingFormValues,
} from './schema';

const blankPrompt = (
  idx: number,
): SpeakingFormValues['prompts'][number] => ({
  idx,
  part: 1,
  text: '',
  cueCardPointsText: '',
});

export function SpeakingEditor({
  id,
  defaults,
  audioByPromptId,
}: {
  id: string;
  defaults: SpeakingFormValues;
  /** prompt id -> examiner audio URL, from the server. Cleared when text changes. */
  audioByPromptId: Record<string, string>;
}) {
  const [saving, startSaving] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm<SpeakingFormValues>({
    resolver: zodResolver(speakingFormSchema),
    defaultValues: defaults,
  });
  useUnsavedGuard(isDirty);
  const prompts = useFieldArray({ control, name: 'prompts' });

  const onSubmit = (values: SpeakingFormValues) => {
    startSaving(async () => {
      const result = await saveSpeakingTestAction(toSave(id, values));
      toastResult(result);
      if (result.ok) reset(values);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Test</CardTitle>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>Prompts ({prompts.fields.length})</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => prompts.append(blankPrompt(prompts.fields.length + 1))}
          >
            Add prompt
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {prompts.fields.map((field, i) => {
            const savedId = defaults.prompts[i]?.id;
            const audioUrl = savedId ? audioByPromptId[savedId] : undefined;
            return (
              <fieldset
                key={field.id}
                className="space-y-3 border-b border-border pb-5 last:border-0 last:pb-0"
              >
                <legend className="sr-only">Prompt {i + 1}</legend>
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Idx" className="w-16">
                    <Input
                      type="number"
                      min={1}
                      {...register(`prompts.${i}.idx`, { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label="Part" className="min-w-52 flex-1">
                    <Select
                      {...register(`prompts.${i}.part`, { valueAsNumber: true })}
                    >
                      {[1, 2, 3].map((n) => (
                        <option key={n} value={n}>
                          {PART_TITLE[n]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => prompts.remove(i)}
                  >
                    Remove
                  </Button>
                </div>
                <Field
                  label='Prompt (Part 2: the "Describe …" cue-card line)'
                  required
                  error={errors.prompts?.[i]?.text?.message}
                >
                  <Textarea {...register(`prompts.${i}.text`)} />
                </Field>
                <Field label="Cue-card points" hint="One per line — Part 2 only.">
                  <Textarea
                    className="min-h-20"
                    {...register(`prompts.${i}.cueCardPointsText`)}
                  />
                </Field>
                {audioUrl ? (
                  <audio
                    controls
                    src={audioUrl}
                    className="h-8"
                  />
                ) : savedId ? (
                  <p className="font-mono text-xs text-muted-foreground">
                    Examiner audio will generate after you save.
                  </p>
                ) : null}
              </fieldset>
            );
          })}
        </CardContent>
      </Card>

      <SaveBar dirty={isDirty} saving={saving} />
    </form>
  );
}
