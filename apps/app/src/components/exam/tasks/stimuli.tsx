import type { Stimulus } from '@bandzen/exams/registry';
import type { ComponentType } from 'react';
import type { StimulusData } from '@/lib/task-content';

function Text({ data }: { data: StimulusData }) {
  if (!data.text) return null;
  return (
    <div className="space-y-4 text-sm leading-7 text-pretty">
      {data.text.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function Audio({ data }: { data: StimulusData }) {
  return data.audioUrl ? (
    <audio controls preload="none" src={data.audioUrl} className="w-full" />
  ) : (
    <p className="text-sm text-muted-foreground">No audio attached.</p>
  );
}

function ImageStimulus({ data }: { data: StimulusData }) {
  if (!data.imageUrl) return null;
  return (
    // A data URI or R2 URL of unknown size: next/image needs dimensions it
    // cannot know here, and there is nothing to optimise in an inline SVG.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={data.imageUrl}
      alt={data.imageAlt ?? ''}
      className="w-full border border-border"
    />
  );
}

function Mixed({ data }: { data: StimulusData }) {
  return (
    <div className="space-y-6">
      <ImageStimulus data={data} />
      {data.audioUrl !== undefined ? <Audio data={data} /> : null}
      <Text data={data} />
    </div>
  );
}

/** What the candidate is shown, keyed by the task definition's `stimulus`. */
export const STIMULUS_RENDERERS: Record<
  Stimulus,
  ComponentType<{ data: StimulusData }>
> = {
  text: Text,
  audio: Audio,
  image: ImageStimulus,
  mixed: Mixed,
};
