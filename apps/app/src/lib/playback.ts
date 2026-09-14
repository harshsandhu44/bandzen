import type { ListeningPlayback } from '@bandzen/db/schema';

/** Sub-second wobble in wall-clock accumulation shouldn't read as a replay. */
const REPLAY_FLOOR_SECONDS = 2;

const clock = (seconds: number) => {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/**
 * The condition line under the score on a listening review. Practice audio
 * can be paused, seeked and replayed; the band is reported the same either
 * way, so this is what tells the candidate which kind of attempt they are
 * looking at. Descriptive, never a penalty.
 *
 * `null` playback — a mock section, or any attempt from before the player
 * gained a transport — was genuinely single-play, so it reads as clean.
 * A track with no stored duration can't tell replay from a long listen, so
 * that part is simply left unsaid.
 */
export function describePlayback(
  playback: ListeningPlayback | null,
  durationSeconds: number | null,
): string {
  const replayed =
    playback && durationSeconds
      ? playback.listenedSeconds - durationSeconds
      : 0;
  const parts = [
    playback?.pauses ? `paused ${playback.pauses}×` : null,
    playback?.seeks ? `seeked ${playback.seeks}×` : null,
    replayed >= REPLAY_FLOOR_SECONDS ? `replayed ${clock(replayed)}` : null,
  ].filter((p) => p !== null);

  return parts.length
    ? `${parts.join(' · ')} · not exam conditions`
    : 'played straight through · exam conditions';
}
