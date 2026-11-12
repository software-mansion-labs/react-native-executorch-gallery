import { advanceNemotronMemory, type NemotronMemory } from './nemotronMemory';
import RNBlobUtil from 'react-native-blob-util';
import { loadModel, tensor, wrapAsync, type Model, type Tensor } from 'react-native-executorch';
import {
  validateSpec,
  f32,
  i64,
  method,
  RangeDim,
  constraint,
} from 'react-native-executorch/schema';
import { speakerSpans } from './speakerMemory';

export const NEMOTRON_FILE_NAME = 'nemotron3_diarization_xnnpack_fp32.pte';
export const NEMOTRON_PATH = `${RNBlobUtil.fs.dirs.DocumentDir}/custom-models/${NEMOTRON_FILE_NAME}`;
export const SAMPLE_RATE = 16000;
export const CHUNK_SAMPLES = 160000;
const WIDTH = 512;
const SPEAKERS = 8;

/** Loads this recipe's exact contract; dynamic input sizes avoid padded encoder computation. */
export async function loadNemotron(path: string) {
  const model = await wrapAsync(loadModel)(path);
  try {
    const equalTime = constraint.equality(
      { paramSide: 'input', tensorIdx: 0, dimIdx: 1 },
      { paramSide: 'input', tensorIdx: 1, dimIdx: 1 }
    );
    validateSpec(model.schema, {
      nemotron: {
        ...method('preprocess', [f32(160000), i64(1)], [f32(1, 1001, 128)]),
        ...method('embed', [f32(1, RangeDim(8, 1008, 8), 128)], [f32(1, RangeDim(1, 126), 512)]),
        ...method(
          'encode',
          [f32(1, RangeDim(2, 800), 512), i64(1, RangeDim(2, 800))],
          [f32(1, RangeDim(16, 6400, 8), 8), f32(1, RangeDim(2, 800), 8)],
          [equalTime]
        ),
        ...method(
          'compress',
          [f32(1, RangeDim(265, 800), 512), f32(1, RangeDim(265, 800), 8)],
          [f32(1, 264, 512), f32(1, 264, 8)],
          [equalTime]
        ),
      },
    });
    const valid = await wrapAsync((loaded: Model) => {
      'worklet';
      return (
        loaded.execute('max_num_of_spks', [], [])[0] === 8 &&
        loaded.execute('sample_rate', [], [])[0] === 16000 &&
        loaded.execute('spkcache_len', [], [])[0] === 264 &&
        loaded.execute('fifo_len', [], [])[0] === 264 &&
        loaded.execute('cache_update_period', [], [])[0] === 222 &&
        loaded.execute('frame_stride', [], [])[0] === 0.01 &&
        loaded.execute('subsampling_factor', [], [])[0] === 8
      );
    })(model);
    if (!valid) throw new Error('Unsupported Nemotron streaming constants');
    return model;
  } catch (cause) {
    await disposeNemotron(model);
    throw cause;
  }
}

/** Executes preprocessing, encoding and the exported original HF cache-compression policy.
 * Streaming FIFO sequencing follows Transformers 5.20 Nemotron3DiarizationSpeakerCache.
 * Only bounded latent state survives a call. No waveform or tensor is persisted.
 */
export const inferNemotron = wrapAsync(
  (model: Model, audio: Float32Array, memory: NemotronMemory) => {
    'worklet';
    const allocated: Tensor[] = [];
    const make = (dtype: 'float32' | 'int64', shape: number[]) => {
      const value = tensor(dtype, shape);
      allocated.push(value);
      return value;
    };
    try {
      if (audio.length < 1600 || audio.length > CHUNK_SAMPLES)
        throw new Error('Expected 0.1–10 seconds of mono 16 kHz audio');
      const padded = new Float32Array(CHUNK_SAMPLES);
      padded.set(audio);
      const waveform = make('float32', [CHUNK_SAMPLES]).setData(padded);
      padded.fill(0);
      const length = make('int64', [1]).setData(new BigInt64Array([BigInt(audio.length)]));
      const features = make('float32', [1, 1001, 128]);
      model.execute('preprocess', [waveform, length], [features]);
      waveform.setData(padded);
      const values = features.getData(new Float32Array(1001 * 128));
      const validFrames = Math.floor(audio.length / 160);
      const featureFrames = validFrames + 1;
      const chunkFrames = Math.ceil(featureFrames / 8);
      const mel = new Float32Array(chunkFrames * 8 * 128);
      mel.set(values.subarray(0, featureFrames * 128));
      const melTensor = make('float32', [1, chunkFrames * 8, 128]).setData(mel);
      const chunkTensor = make('float32', [1, chunkFrames, WIDTH]);
      model.execute('embed', [melTensor], [chunkTensor]);
      const chunk = chunkTensor.getData(new Float32Array(chunkFrames * WIDTH));
      const cacheFrames = memory.cache.length / WIDTH;
      const prefix = cacheFrames + memory.fifo.length / WIDTH;
      const total = prefix + chunkFrames;
      if (total > 800) throw new Error('Speaker cache exceeds the exported bound');
      const combined = new Float32Array(total * WIDTH);
      combined.set(memory.cache);
      combined.set(memory.fifo, memory.cache.length);
      combined.set(chunk, prefix * WIDTH);
      const valid = new BigInt64Array(total);
      for (let i = 0; i < total; i++)
        valid[i] = BigInt(i < prefix || (i - prefix) * 8 < validFrames ? 1 : 0);
      const input = make('float32', [1, total, WIDTH]).setData(combined);
      const mask = make('int64', [1, total]).setData(valid);
      const probabilitiesTensor = make('float32', [1, total * 8, SPEAKERS]);
      const pooledTensor = make('float32', [1, total, SPEAKERS]);
      model.execute('encode', [input, mask], [probabilitiesTensor, pooledTensor]);
      const probabilities = probabilitiesTensor.getData(new Float32Array(total * 8 * SPEAKERS));
      const pooled = pooledTensor.getData(new Float32Array(total * SPEAKERS));
      const next = advanceNemotronMemory(memory, chunk, pooled);
      if (next.needsCompression) {
        const frames = next.memory.cache.length / WIDTH;
        const sourceEmb = make('float32', [1, frames, WIDTH]).setData(next.memory.cache);
        const sourceProb = make('float32', [1, frames, SPEAKERS]).setData(
          next.memory.cacheProbabilities
        );
        const targetEmb = make('float32', [1, 264, WIDTH]);
        const targetProb = make('float32', [1, 264, SPEAKERS]);
        model.execute('compress', [sourceEmb, sourceProb], [targetEmb, targetProb]);
        next.memory.cache = targetEmb.getData(new Float32Array(264 * WIDTH));
        next.memory.cacheProbabilities = targetProb.getData(new Float32Array(264 * SPEAKERS));
        next.memory.compressed = true;
      }
      return {
        memory: next.memory,
        spans: speakerSpans(
          probabilities.slice(prefix * 8 * SPEAKERS, (prefix * 8 + validFrames) * SPEAKERS),
          audio.length / SAMPLE_RATE,
          SPEAKERS,
          0.01
        ),
      };
    } finally {
      audio.fill(0);
      for (const value of allocated.reverse()) value.dispose();
    }
  }
);

export const disposeNemotron = wrapAsync((model: Model) => {
  'worklet';
  model.dispose();
});
