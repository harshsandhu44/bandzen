import { pcmChunksToWav } from './wav';

/**
 * Records raw mono PCM off a `MediaStream` and encodes it to a 16 kHz WAV on
 * stop. Deliberately not `MediaRecorder` — see `wav.ts` for why its container
 * output cannot be decoded reliably.
 *
 * Uses `ScriptProcessorNode`. It is deprecated in favour of `AudioWorklet`,
 * but a worklet needs a separately-loaded module and this runs for at most two
 * minutes of speech on a near-idle page, where a main-thread node is fine. The
 * `analyser` is exposed for the live input-level meter.
 */
export type PcmRecorder = {
  analyser: AnalyserNode;
  /** Stop capture, tear down the graph, and return the encoded WAV. */
  stop: () => Blob;
};

const BUFFER_SIZE = 4096;

export function startPcmRecording(stream: MediaStream): PcmRecorder {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  const ctx = new AudioCtx();
  // Holding a live mic stream satisfies the autoplay policy's capture
  // exception, so this is allowed even when begun from a timer rather than a
  // direct click (Part 2's prep countdown).
  void ctx.resume();

  const source = ctx.createMediaStreamSource(stream);

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
  const chunks: Float32Array[] = [];
  processor.onaudioprocess = (e) => {
    // `.slice()` — the event buffer is reused between callbacks.
    chunks.push(e.inputBuffer.getChannelData(0).slice(0));
  };

  // A silent sink: some browsers only run `onaudioprocess` while the node is
  // connected to the destination, and routing the mic to the speakers without
  // this would be an echo.
  const sink = ctx.createGain();
  sink.gain.value = 0;
  source.connect(processor);
  processor.connect(sink);
  sink.connect(ctx.destination);

  return {
    analyser,
    stop() {
      processor.disconnect();
      source.disconnect();
      sink.disconnect();
      processor.onaudioprocess = null;
      const wav = pcmChunksToWav(chunks, ctx.sampleRate);
      void ctx.close();
      return wav;
    },
  };
}
