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
import { Input } from '@bandzen/ui/components/input';
import { Select } from '@bandzen/ui/components/select';
import { Textarea } from '@bandzen/ui/components/textarea';
import { SaveBar } from '@/components/editor-shell';
import { toastResult } from '@/components/toast';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';
import { saveResourceAction } from '../actions';
import {
  CATEGORIES,
  LEVELS,
  MODULES,
  QUESTION_KINDS,
  resourceFormSchema,
  toSave,
  type ResourceFormValues,
} from './schema';

export function ResourceEditor({
  id,
  defaults,
}: {
  id: string;
  defaults: ResourceFormValues;
}) {
  const [saving, startSaving] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: defaults,
  });
  useUnsavedGuard(isDirty);

  const onSubmit = (values: ResourceFormValues) => {
    startSaving(async () => {
      const result = await saveResourceAction(id, toSave(values));
      toastResult(result);
      if (result.ok) reset(values);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Title" required error={errors.title?.message}>
            <Input {...register('title')} />
          </Field>
          <Field label="Summary" required error={errors.summary?.message}>
            <Input {...register('summary')} />
          </Field>
          <div className="flex flex-wrap gap-4">
            <Field label="Category" className="w-44">
              <Select {...register('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Level" className="w-40">
              <Select {...register('level')}>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Minutes" className="w-24">
              <Input
                type="number"
                min={1}
                {...register('minutes', { valueAsNumber: true })}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-4">
            <Field label="Module" hint="Optional" className="w-44">
              <Select {...register('module')}>
                <option value="">None</option>
                {MODULES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Question kind" hint="Optional" className="w-56">
              <Select {...register('questionKind')}>
                <option value="">None</option>
                {QUESTION_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Body"
            hint="One blank line between paragraphs."
          >
            <Textarea className="min-h-64" {...register('bodyText')} />
          </Field>
        </CardContent>
      </Card>
      <SaveBar dirty={isDirty} saving={saving} />
    </form>
  );
}
