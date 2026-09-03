'use client';

import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@bandzen/ui/components/card';
import { Field } from '@bandzen/ui/components/field';
import { Select } from '@bandzen/ui/components/select';
import { Textarea } from '@bandzen/ui/components/textarea';
import { SaveBar } from '@/components/editor-shell';
import { toastResult } from '@/components/toast';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';
import { savePromptAction } from '../actions';
import { promptFormSchema, type PromptFormValues } from './schema';

export function PromptEditor({
  id,
  defaults,
}: {
  id: string;
  defaults: PromptFormValues;
}) {
  const [saving, startSaving] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm<PromptFormValues>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: defaults,
  });
  useUnsavedGuard(isDirty);

  const onSubmit = (values: PromptFormValues) => {
    startSaving(async () => {
      const result = await savePromptAction(id, values);
      toastResult(result);
      if (result.ok) reset(values);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Field label="Task" className="w-28">
              <Select {...register('task', { valueAsNumber: true })}>
                <option value={1}>Task 1</option>
                <option value={2}>Task 2</option>
              </Select>
            </Field>
            <Field label="Format" className="w-40">
              <Select {...register('format')}>
                <option value="academic">Academic</option>
                <option value="general">General</option>
              </Select>
            </Field>
          </div>
          <Field
            label="Prompt text"
            required
            error={errors.promptText?.message}
          >
            <Textarea className="min-h-40" {...register('promptText')} />
          </Field>
        </CardContent>
      </Card>
      <SaveBar dirty={isDirty} saving={saving} />
    </form>
  );
}
