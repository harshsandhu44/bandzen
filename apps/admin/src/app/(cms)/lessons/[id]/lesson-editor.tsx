'use client';

import { useTransition } from 'react';
import {
  Controller,
  useForm,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { STAGE_TITLE, questionKind } from '@bandzen/db/schema';
import { Button } from '@bandzen/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@bandzen/ui/components/card';
import { Checkbox } from '@bandzen/ui/components/checkbox';
import { Field } from '@bandzen/ui/components/field';
import { Input } from '@bandzen/ui/components/input';
import { Select } from '@bandzen/ui/components/select';
import { Textarea } from '@bandzen/ui/components/textarea';
import { SaveBar } from '@/components/editor-shell';
import { toast, toastResult } from '@/components/toast';
import { useUnsavedGuard } from '@/lib/use-unsaved-guard';
import { saveLessonAction } from '../actions';
import {
  BLOCK_KINDS,
  blankBlock,
  lessonFormSchema,
  toSave,
  type LessonFormValues,
} from './schema';

const KIND_HINT: Record<string, string> = {
  prose: 'A paragraph of explanation.',
  steps: 'An ordered list — one step per line.',
  checklist: 'An unordered list — one item per line.',
  callout: 'A highlighted note or warning.',
  example: 'A worked example the reader studies.',
  try: 'A question the reader answers before revealing.',
  video: 'An embedded video (e.g. a YouTube embed link).',
};

function BlockRow({
  control,
  register,
  stageIndex,
  blockIndex,
  onRemove,
}: {
  control: Control<LessonFormValues>;
  register: UseFormRegister<LessonFormValues>;
  stageIndex: number;
  blockIndex: number;
  onRemove: () => void;
}) {
  const kind = useWatch({
    control,
    name: `stages.${stageIndex}.blocks.${blockIndex}.kind`,
  });
  const p = `stages.${stageIndex}.blocks.${blockIndex}` as const;

  return (
    <fieldset className="space-y-3 border border-border p-3">
      <legend className="sr-only">Block {blockIndex + 1}</legend>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Kind" hint={KIND_HINT[kind]} className="min-w-48 flex-1">
          <Select {...register(`${p}.kind`)}>
            {BLOCK_KINDS.map((k) => (
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
          onClick={onRemove}
        >
          Remove
        </Button>
      </div>

      {(kind === 'prose' || kind === 'callout') && (
        <Field label="Body">
          <Textarea {...register(`${p}.body`)} />
        </Field>
      )}
      {(kind === 'steps' || kind === 'checklist') && (
        <Field label="Items" hint="One per line.">
          <Textarea {...register(`${p}.itemsText`)} />
        </Field>
      )}
      {kind === 'callout' && (
        <div className="flex flex-wrap gap-3">
          <Field label="Tone" className="w-32">
            <Select {...register(`${p}.calloutTone`)}>
              <option value="note">note</option>
              <option value="warning">warning</option>
            </Select>
          </Field>
          <Field label="Title" className="min-w-48 flex-1">
            <Input {...register(`${p}.title`)} />
          </Field>
        </div>
      )}
      {(kind === 'example' || kind === 'try') && (
        <>
          <Field
            label="Source"
            hint={kind === 'try' ? 'Optional' : undefined}
          >
            <Input {...register(`${p}.source`)} />
          </Field>
          <Field label="Question">
            <Textarea {...register(`${p}.question`)} />
          </Field>
          <Field label="Answer">
            <Textarea {...register(`${p}.answer`)} />
          </Field>
          <Field label="Why">
            <Textarea {...register(`${p}.why`)} />
          </Field>
        </>
      )}
      {kind === 'video' && (
        <div className="flex flex-wrap gap-3">
          <Field
            label="Video URL"
            hint="An embeddable link, e.g. a YouTube embed URL."
            className="min-w-64 flex-1"
          >
            <Input {...register(`${p}.url`)} />
          </Field>
          <Field label="Title" hint="Optional" className="min-w-48 flex-1">
            <Input {...register(`${p}.title`)} />
          </Field>
        </div>
      )}
    </fieldset>
  );
}

function StageSection({
  control,
  register,
  stageIndex,
}: {
  control: Control<LessonFormValues>;
  register: UseFormRegister<LessonFormValues>;
  stageIndex: number;
}) {
  const stageId = useWatch({
    control,
    name: `stages.${stageIndex}.id`,
  });
  const present = useWatch({
    control,
    name: `stages.${stageIndex}.present`,
  });
  const blocks = useFieldArray({
    control,
    name: `stages.${stageIndex}.blocks`,
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">
          {STAGE_TITLE[stageId as keyof typeof STAGE_TITLE]}
        </CardTitle>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Controller
            control={control}
            name={`stages.${stageIndex}.present`}
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          Include this stage
        </label>
      </CardHeader>
      {present ? (
        <CardContent className="space-y-4">
          {blocks.fields.map((field, i) => (
            <BlockRow
              key={field.id}
              control={control}
              register={register}
              stageIndex={stageIndex}
              blockIndex={i}
              onRemove={() => blocks.remove(i)}
            />
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => blocks.append(blankBlock())}
          >
            Add block
          </Button>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function LessonEditor({
  id,
  defaults,
}: {
  id: string;
  defaults: LessonFormValues;
}) {
  const [saving, startSaving] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: defaults,
  });
  useUnsavedGuard(isDirty);
  const stages = useFieldArray({ control, name: 'stages' });

  const onSubmit = (values: LessonFormValues) => {
    startSaving(async () => {
      const result = await saveLessonAction(toSave(id, values));
      toastResult(result);
      if (result.ok) reset(values);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, () => toast.error("Some fields need fixing — check the form."))} className="space-y-6">
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
            <Field label="Minutes" className="w-24">
              <Input
                type="number"
                min={1}
                {...register('minutes', { valueAsNumber: true })}
              />
            </Field>
            <Field label="Question kind" hint="Optional" className="w-56">
              <Select {...register('questionKind')}>
                <option value="">None</option>
                {questionKind.enumValues.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="font-title text-title">Stages</h2>
        {stages.fields.map((field, i) => (
          <StageSection
            key={field.id}
            control={control}
            register={register}
            stageIndex={i}
          />
        ))}
      </div>

      <SaveBar dirty={isDirty} saving={saving} />
    </form>
  );
}
