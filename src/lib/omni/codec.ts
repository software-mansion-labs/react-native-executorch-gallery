import { tensor, type loadModel } from 'react-native-executorch';

// Five causal width-7 convolutions and three 30-position attention windows
// require 117 prior upsampled positions. Six positions per codec frame plus
// the ISTFT overlap fit within 20 frames; keep 24 as a conservative margin.
export const OMNI_CODEC_CONTEXT_FRAMES = 24;
export const OMNI_FRAME_SAMPLES = 1920;
const OVERLAP_SAMPLES = 480;

/** Decodes a bounded causal window and returns only newly stable PCM, including the final ISTFT tail. */
export function decodeOmniAudioWindow(
  model: ReturnType<typeof loadModel>,
  frames: readonly (readonly number[])[],
  emittedSamples: number,
  maxWindowFrames: number,
  final: boolean
) {
  'worklet';
  const count = frames.length;
  const previousFrames = Math.floor((emittedSamples + OVERLAP_SAMPLES) / OMNI_FRAME_SAMPLES);
  const start = Math.max(0, previousFrames - OMNI_CODEC_CONTEXT_FRAMES);
  const windowFrames = count - start;
  if (windowFrames > maxWindowFrames)
    throw new Error('Speech decoding window exceeds the exported codec range.');
  const packed = BigInt64Array.from({ length: 12 * windowFrames }, (_, i) =>
    BigInt(frames[start + (i % windowFrames)][Math.floor(i / windowFrames)])
  );
  const codes = tensor('int64', [1, 12, windowFrames], packed);
  const output = tensor('float32', [1, windowFrames * OMNI_FRAME_SAMPLES]);
  try {
    const started = Date.now();
    model.execute('audio_decoder', [codes], [output]);
    const durationMs = Date.now() - started;
    const pcm = output.getData(new Float32Array(output.numel));
    const end = count * OMNI_FRAME_SAMPLES - (final ? 0 : OVERLAP_SAMPLES);
    return {
      samples: pcm.slice(
        emittedSamples - start * OMNI_FRAME_SAMPLES,
        end - start * OMNI_FRAME_SAMPLES
      ),
      emittedSamples: end,
      durationMs,
      windowFrames,
    };
  } finally {
    codes.dispose();
    output.dispose();
  }
}
