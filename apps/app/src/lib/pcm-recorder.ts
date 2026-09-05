import { pcmChunksToWav } from './wav';

/**
 * Records raw mono PCM off a `MediaStream` and encodes it to a 16 kHz WAV on
 * stop. Deliberately not `MediaRecorder` — see `wav.ts` for why its container
 * output cannot be decoded reliably.
 *
 * Uses an `AudioWorkletProcessor`, not `ScriptProcessorNode`: the worklet's
 * `process()` runs on the audio rendering thread and always receives the input
 * quantum, whereas a `ScriptProcessorNode` on the main thread can be starved
 * (and Chrome will skip filling its input buffer if it decides the output is
 * inaudible — which is how a "silent recording" happens). The worklet module
 * is inlined as a blob URL so there is no separate file to bundle.
 */
export type PcmRecorder = {
  analyser: AnalyserNode;
  /** Stop capture, tear down the graph, and return the encoded WAV + peak. */
  stop: () => Promise<{ wav: Blob; peak: number }>;
};

const WORKLET_SRC = `
class PcmRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = new Float32Array(4096);
    this._n = 0;
    this.port.onmessage = () => this._flush();
  }
  _flush() {
    if (this._n > 0) {
      this.port.postMessage(this._buf.slice(0, this._n));
      this._n = 0;
    }
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this._buf[this._n++] = ch[i];
        if (this._n === this._buf.length) this._flush();
      }
    }
    return true;
  }
}
registerProcessor('pcm-recorder', PcmRecorder);
`;

export async function startPcmRecording(
  stream: MediaStream,
): Promise<PcmRecorder> {
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;

  const ctx = new AudioCtx();
  // Holding a live mic stream satisfies the autoplay policy's capture
  // exception, so this is allowed even when begun from a timer rather than a
  // direct click (Part 2's prep countdown).
  await ctx.resume().catch(() => {});

  const moduleUrl = URL.createObjectURL(
    new Blob([WORKLET_SRC], { type: 'application/javascript' }),
  );
  try {
    await ctx.audioWorklet.addModule(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }

  const source = ctx.createMediaStreamSource(stream);

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const node = new AudioWorkletNode(ctx, 'pcm-recorder', {
    numberOfInputs: 1,
    numberOfOutputs: 0,
    channelCount: 1,
    channelCountMode: 'explicit',
  });

  const chunks: Float32Array[] = [];
  node.port.onmessage = (e: MessageEvent<Float32Array>) => {
    chunks.push(e.data);
  };
  source.connect(node);

  return {
    analyser,
    async stop() {
      // Ask the worklet to post its partial buffer, then give the message a
      // tick to arrive before we tear the graph down.
      node.port.postMessage('flush');
      await new Promise((r) => setTimeout(r, 30));
      node.port.onmessage = null;
      node.disconnect();
      source.disconnect();

      let peak = 0;
      for (const c of chunks)
        for (let i = 0; i < c.length; i++) {
          const v = Math.abs(c[i]!);
          if (v > peak) peak = v;
        }

      const wav = pcmChunksToWav(chunks, ctx.sampleRate);
      void ctx.close();
      return { wav, peak };
    },
  };
}
