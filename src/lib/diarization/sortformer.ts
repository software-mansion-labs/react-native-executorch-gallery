// Streaming cache policy adapted from ExecuTorch Sortformer.
// Copyright (c) Meta Platforms, Inc. and affiliates. All rights reserved.
// BSD license and attribution: docs/sortformer-NOTICE.txt.
import { validateSpec, f32, i64, method } from 'react-native-executorch/schema';
import { compressCache, speakerSpans, type SpeakerMemory } from './speakerMemory';
import { loadModel, tensor, wrapAsync, type Model, type Tensor } from 'react-native-executorch';

// Export: Apache-2.0, younghan-meta/Sortformer-ExecuTorch-XNNPACK.
export const SORTFORMER_URL =
  'https://huggingface.co/younghan-meta/Sortformer-ExecuTorch-XNNPACK/resolve/4a157759fdc2128fe686073e8eecd391df445fad/sortformer.pte';
export const SAMPLE_RATE = 16000;
export const CHUNK_SAMPLES = 160000;
const WIDTH = 512;
const FIFO_FRAMES = 124;

/** Loads the exact fixed-shape export contract. No runtime or library patches are needed. */
export async function loadSortformer(path: string) {
  const model = await wrapAsync(loadModel)(path);
  try {
    validateSpec(model.schema, {
      fixed: {
        ...method('preprocessor', [f32(1920000), i64(1)], [f32(1, 128, 12001), i64(1)]),
        ...method('pre_encode', [f32(1, 4000, 128), i64(1)], [f32(1, 500, 512), i64(1)]),
        ...method('encode', [f32(1, 1000, 512), i64(1)], [f32(1, 1000, 4)]),
      },
    });
    const constantsMatch = await wrapAsync((loaded: Model) => {
      'worklet';
      return (
        loaded.execute('sample_rate', [], [])[0] === SAMPLE_RATE &&
        loaded.execute('max_num_of_spks', [], [])[0] === 4 &&
        loaded.execute('subsampling_factor', [], [])[0] === 8 &&
        loaded.execute('window_stride', [], [])[0] === 0.01 &&
        loaded.execute('spkcache_len', [], [])[0] === 188
      );
    })(model);
    if (!constantsMatch) throw new Error('Unsupported Sortformer constants');
    return model;
  } catch (cause) {
    await disposeSortformer(model);
    throw cause;
  }
}

/** Runs bounded PCM on the background runtime; only latent speaker memory survives each call. */
export const inferSpeakers = wrapAsync(
  (model: Model, audio: Float32Array, memory: SpeakerMemory) => {
    'worklet';
    if (audio.length < 1600 || audio.length > CHUNK_SAMPLES)
      throw new Error('Expected 0.1–10 seconds of mono 16 kHz PCM');
    const allocated: Tensor[] = [];
    const make = (dtype: 'float32' | 'int64', shape: number[]) => {
      const t = tensor(dtype, shape);
      allocated.push(t);
      return t;
    };
    try {
      // This export has no companion dynamic schema. Pad to its reflected bounds,
      // passing real lengths for masking. Host comparison: max probability delta < 6e-7.
      const paddedAudio = new Float32Array(1920000);
      paddedAudio.set(audio);
      const waveform = make('float32', [1920000]).setData(paddedAudio);
      paddedAudio.fill(0);
      const length = make('int64', [1]).setData(new BigInt64Array([BigInt(audio.length)]));
      const mel = make('float32', [1, 128, 12001]);
      const melLength = make('int64', [1]);
      model.execute('preprocessor', [waveform, length], [mel, melLength]);
      waveform.setData(paddedAudio);
      const validMel = Number(melLength.getData(new BigInt64Array(1))[0]);
      if (validMel < 1 || validMel > 1000) throw new Error('Invalid mel length');
      const melValues = mel.getData(new Float32Array(128 * 12001));
      const transposed = new Float32Array(4000 * 128);
      for (let t = 0; t < validMel; t++) {
        for (let f = 0; f < 128; f++) transposed[t * 128 + f] = melValues[f * 12001 + t];
      }
      const features = make('float32', [1, 4000, 128]).setData(transposed);
      const featureLength = make('int64', [1]).setData(new BigInt64Array([BigInt(validMel)]));
      const embeddings = make('float32', [1, 500, 512]);
      const embeddingLength = make('int64', [1]);
      model.execute('pre_encode', [features, featureLength], [embeddings, embeddingLength]);
      const count = Number(embeddingLength.getData(new BigInt64Array(1))[0]);
      if (count < 1 || count > 125) throw new Error('Invalid embedding length');
      const chunk = embeddings.getData(new Float32Array(500 * WIDTH)).slice(0, count * WIDTH);
      const combined = new Float32Array(1000 * WIDTH);
      combined.set(memory.cache);
      combined.set(memory.fifo, memory.cache.length);
      combined.set(chunk, memory.cache.length + memory.fifo.length);
      const prefix = (memory.cache.length + memory.fifo.length) / WIDTH;
      const encodeInput = make('float32', [1, 1000, 512]).setData(combined);
      const encodeLength = make('int64', [1]).setData(new BigInt64Array([BigInt(prefix + count)]));
      const predictions = make('float32', [1, 1000, 4]);
      model.execute('encode', [encodeInput, encodeLength], [predictions]);
      const probabilities = predictions.getData(new Float32Array(4000));
      const fifoAndChunk = new Float32Array(memory.fifo.length + chunk.length);
      fifoAndChunk.set(memory.fifo);
      fifoAndChunk.set(chunk, memory.fifo.length);
      const overflow = Math.max(0, fifoAndChunk.length / WIDTH - FIFO_FRAMES);
      const cache = new Float32Array(memory.cache.length + overflow * WIDTH);
      cache.set(memory.cache);
      cache.set(fifoAndChunk.subarray(0, overflow * WIDTH), memory.cache.length);
      const nextMemory = {
        cache: compressCache(cache, probabilities),
        fifo: fifoAndChunk.slice(overflow * WIDTH),
      };
      return {
        memory: nextMemory,
        spans: speakerSpans(
          probabilities.slice(prefix * 4, (prefix + count) * 4),
          audio.length / SAMPLE_RATE
        ),
      };
    } finally {
      audio.fill(0);
      for (const t of allocated.reverse()) t.dispose();
    }
  }
);

export const disposeSortformer = wrapAsync((model: Model) => {
  'worklet';
  model.dispose();
});
