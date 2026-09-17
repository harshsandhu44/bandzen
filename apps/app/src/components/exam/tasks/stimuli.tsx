import type { Stimulus, TaskAudioPolicy } from '@bandzen/exams/registry';
import type { ComponentType } from 'react';
import type { StimulusData } from '@/lib/task-content';
import { TaskAudio } from './task-audio';

/**
 * Every stimulus takes the item's data; only audio reads the task's policy.
 * `alreadyPlayed`, `onStart` and `onEnded` are how a mock keeps a single play
 * single across remounts: the runner owns them, the player only reports.
 */
export type StimulusProps = {
  data: StimulusData;
  audio?: TaskAudioPolicy;
  alreadyPlayed?: boolean;
  onStart?: () => void;
  onEnded?: () => void;
};

function Text({ data }: StimulusProps) {
  if (!data.text) return null;
  return (
    <div className="space-y-4 text-sm leading-7 text-pretty">
      {data.text.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function Audio({
  data,
  audio,
  alreadyPlayed,
  onStart,
  onEnded,
}: StimulusProps) {
  if (!data.audioUrl) {
    return <p className="text-sm text-muted-foreground">No audio attached.</p>;
  }
  // No policy means an ordinary player with a full transport, which is what
  // IELTS practice wants: the point there is going back over the bit you missed.
  return audio ? (
    <TaskAudio
      src={data.audioUrl}
      policy={audio}
      alreadyPlayed={alreadyPlayed}
      onStart={onStart}
      onEnded={onEnded}
    />
  ) : (
    <audio controls preload="none" src={data.audioUrl} className="w-full" />
  );
}

function ImageStimulus({ data }: StimulusProps) {
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

function Mixed(props: StimulusProps) {
  const { data } = props;
  return (
    <div className="space-y-6">
      <ImageStimulus data={data} />
      {data.audioUrl ? <Audio {...props} /> : null}
      <Text data={data} />
    </div>
  );
}

/** What the candidate is shown, keyed by the task definition's `stimulus`. */
export const STIMULUS_RENDERERS: Record<
  Stimulus,
  ComponentType<StimulusProps>
> = {
  text: Text,
  audio: Audio,
  image: ImageStimulus,
  mixed: Mixed,
};
