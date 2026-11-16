import type { TimedWord } from './wordSpeakers';
import RNBlobUtil from 'react-native-blob-util';
import {
  createFsmnVoiceActivityDetector,
  loadModel,
  models,
  tensor,
  wrapAsync,
  type Model,
  type Tensor,
} from 'react-native-executorch';
import { loadTokenizer, type Tokenizer } from 'react-native-executorch/nlp';
import {
  constraint,
  f32,
  i64,
  method,
  RangeDim,
  validateSpec,
} from 'react-native-executorch/schema';

export const FLUID_DIRECTORY = `${RNBlobUtil.fs.dirs.DocumentDir}/custom-models/fluid-speech`;
export const FLUID_COMPONENTS = [
  'preprocess',
  'subsample',
  'encoder',
  'predictor',
  'joint',
] as const;
export type FluidComponent = (typeof FLUID_COMPONENTS)[number];
export const FLUID_SPEECH = {
  preprocess: `${FLUID_DIRECTORY}/fluid_speech_pro_preprocess_xnnpack_fp32.pte`,
  subsample: `${FLUID_DIRECTORY}/fluid_speech_pro_subsample_xnnpack_fp32.pte`,
  encoder: `${FLUID_DIRECTORY}/fluid_speech_pro_encoder_xnnpack_int8dyn.pte`,
  predictor: `${FLUID_DIRECTORY}/fluid_speech_pro_predictor_xnnpack_fp32.pte`,
  joint: `${FLUID_DIRECTORY}/fluid_speech_pro_joint_xnnpack_fp32.pte`,
  tokenizerPath: `${FLUID_DIRECTORY}/tokenizer.json`,
  vadModel: models.voiceActivityDetection.FSMN_VAD.XNNPACK_FP32,
};
export type FluidSpeechConfig = typeof FLUID_SPEECH;
type FluidModels = Record<FluidComponent, Model>;

export const disposeFluidModel = wrapAsync((model: Model | Tokenizer) => {
  'worklet';
  model.dispose();
});

/** Checks the actual exported method contracts before an imported component is installed or used. */
export async function loadFluidComponent(name: FluidComponent, path: string) {
  const model = await wrapAsync(loadModel)(path);
  try {
    let expected;
    if (name === 'preprocess')
      expected = method('forward', [f32(1, 160000), i64(1)], [f32(1, 128, 1001), i64(1)]);
    else if (name === 'predictor')
      expected = method(
        'forward',
        [i64(1, 1), f32(2, 1, 640), f32(2, 1, 640)],
        [f32(1, 1, 640), f32(2, 1, 640), f32(2, 1, 640)]
      );
    else if (name === 'joint')
      expected = method('forward', [f32(1, 1, 1024), f32(1, 1, 640)], [f32(1, 1, 1, 8198)]);
    else if (name === 'encoder')
      expected = method(
        'forward',
        [f32(1, RangeDim(3, 126), 1024), i64(1)],
        [f32(1, 1024, RangeDim(3, 126)), i64(1)],
        [
          constraint.equality(
            { paramSide: 'input', tensorIdx: 0, dimIdx: 1 },
            { paramSide: 'output', tensorIdx: 0, dimIdx: 2 }
          ),
        ]
      );
    else {
      expected = {};
      for (let residue = 0; residue < 8; residue++) {
        const low = Math.ceil((17 - residue) / 8),
          high = Math.floor((1001 - residue) / 8);
        const offset = Number(residue !== 0);
        Object.assign(
          expected,
          method(
            `forward_${residue}`,
            [f32(1, 128, RangeDim(8 * low + residue, 8 * high + residue, 8)), i64(1)],
            [f32(1, RangeDim(low + offset, high + offset), 1024), i64(1)],
            [
              constraint.linear(
                { paramSide: 'input', tensorIdx: 0, dimIdx: 2 },
                { paramSide: 'output', tensorIdx: 0, dimIdx: 1 },
                8,
                residue - 8 * offset
              ),
            ]
          )
        );
      }
    }
    validateSpec(model.schema, { fluid: expected });
    return model;
  } catch (error) {
    await disposeFluidModel(model);
    throw error;
  }
}

export async function loadFluidTokenizer(path: string) {
  const tokenizer = await wrapAsync(loadTokenizer)(path);
  try {
    const size = await wrapAsync((value: Tokenizer) => {
      'worklet';
      return { size: value.getVocabSize(), blank: value.tokenToId('<blank>') };
    })(tokenizer);
    if (size.size !== 8193 || size.blank !== 8192)
      throw new Error('Expected the Fluid Speech Pro tokenizer (8192 pieces plus blank).');
    return tokenizer;
  } catch (error) {
    await disposeFluidModel(tokenizer);
    throw error;
  }
}

/** Stateless raw TDT inference. State and scratch tensors are scoped to one independent crop. */
const inferFluidAlignment = wrapAsync((models: FluidModels, audio: Float32Array) => {
  'worklet';
  const allocated: Tensor[] = [];
  const make = (
    dtype: 'float32' | 'int64',
    shape: number[],
    data?: Float32Array | BigInt64Array
  ) => {
    const value = tensor(dtype, shape);
    allocated.push(value);
    if (data) value.setData(data);
    return value;
  };
  const floats = (value: Tensor) => value.getData(new Float32Array(value.numel));
  try {
    if (audio.length < 1600 || audio.length > 160000)
      throw new Error('Expected 0.1–10 seconds of mono 16 kHz audio.');
    const effective = Math.max(16000, audio.length);
    const pcm = new Float32Array(160000);
    pcm.set(audio, Math.floor((effective - audio.length) / 2));
    const input = make('float32', [1, 160000], pcm);
    pcm.fill(0);
    const length = make('int64', [1], new BigInt64Array([BigInt(effective)]));
    const mel = make('float32', [1, 128, 1001]),
      melLength = make('int64', [1]);
    models.preprocess.execute('forward', [input, length], [mel, melLength]);
    input.setData(pcm);
    const frames = Math.floor(effective / 160) + 1,
      steps = Math.ceil(frames / 8);
    const allMel = floats(mel),
      cropped = new Float32Array(128 * frames);
    for (let c = 0; c < 128; c++)
      cropped.set(allMel.subarray(c * 1001, c * 1001 + frames), c * frames);
    const trimmed = make('float32', [1, 128, frames], cropped);
    const embeddings = make('float32', [1, steps, 1024]),
      subLength = make('int64', [1]);
    models.subsample.execute(
      `forward_${frames % 8}`,
      [trimmed, melLength],
      [embeddings, subLength]
    );
    const encoded = make('float32', [1, 1024, steps]),
      encodedLength = make('int64', [1]);
    models.encoder.execute('forward', [embeddings, subLength], [encoded, encodedLength]);
    const valid = Number(encodedLength.getData(new BigInt64Array(1))[0]);
    const acousticData = floats(encoded);
    if (valid < 0 || valid > steps || !acousticData.every(Number.isFinite))
      throw new Error('Invalid Fluid encoder output.');
    let hidden = make('float32', [2, 1, 640], new Float32Array(1280));
    let cell = make('float32', [2, 1, 640], new Float32Array(1280));
    // Two predictor buffers preserve accepted state when a blank is emitted.
    let nextH = make('float32', [2, 1, 640]),
      nextC = make('float32', [2, 1, 640]);
    const prediction = make('float32', [1, 1, 640]);
    const token = make('int64', [1, 1]);
    const predict = (id: number) => {
      token.setData(new BigInt64Array([BigInt(id)]));
      models.predictor.execute('forward', [token, hidden, cell], [prediction, nextH, nextC]);
    };
    predict(8192);
    const acoustic = make('float32', [1, 1, 1024]),
      joint = make('float32', [1, 1, 1, 8198]);
    const values = new Float32Array(1024);
    const tokens: number[] = [];
    const times: number[] = [];
    let frame = 0,
      symbols = 0;
    while (frame < valid) {
      for (let c = 0; c < 1024; c++) values[c] = acousticData[c * steps + frame];
      acoustic.setData(values);
      models.joint.execute('forward', [acoustic, prediction], [joint]);
      const logits = floats(joint);
      if (!logits.every(Number.isFinite)) throw new Error('Invalid Fluid joint output.');
      let label = 0,
        duration = 0;
      for (let i = 1; i < 8193; i++) if (logits[i] > logits[label]) label = i;
      for (let i = 1; i < 5; i++) if (logits[8193 + i] > logits[8193 + duration]) duration = i;
      if (label !== 8192) {
        tokens.push(label);
        times.push(Math.max(0, frame * 0.08 - (effective - audio.length) / 32000));
        [hidden, nextH] = [nextH, hidden];
        [cell, nextC] = [nextC, cell];
        predict(label);
      }
      symbols++;
      frame += duration;
      if (duration > 0) symbols = 0;
      else if (label === 8192 || symbols >= 10) {
        frame++;
        symbols = 0;
      }
      if (tokens.length > 1024) throw new Error('Fluid transcription exceeded its token limit.');
    }
    return { tokens, times };
  } finally {
    audio.fill(0);
    for (const value of allocated.reverse()) value.dispose();
  }
});

/** Raw token IDs retained for fixture comparisons; meeting ASR additionally uses emission times. */
export async function inferFluidTokens(models: FluidModels, audio: Float32Array) {
  return (await inferFluidAlignment(models, audio)).tokens;
}

/** Creates serialized, cancellable full-chunk Fluid ASR with FSMN VAD and no retained audio/state.
 * Cancellation invalidates results immediately; an active native call finishes before resources release.
 */
export async function createFluidSpeechTranscriber(config: FluidSpeechConfig) {
  const loaded: Partial<FluidModels> = {};
  let tokenizer: Tokenizer | undefined;
  let vad: Awaited<ReturnType<typeof createFsmnVoiceActivityDetector>> | undefined;
  const release = async () => {
    vad?.dispose();
    if (tokenizer) await disposeFluidModel(tokenizer);
    for (const model of Object.values(loaded).reverse()) await disposeFluidModel(model);
  };
  try {
    for (const name of FLUID_COMPONENTS)
      loaded[name] = await loadFluidComponent(name, config[name]);
    tokenizer = await loadFluidTokenizer(config.tokenizerPath);
    vad = await createFsmnVoiceActivityDetector(config.vadModel);
  } catch (error) {
    await release();
    throw error;
  }
  const bundle = loaded as FluidModels,
    decoder = tokenizer,
    activity = vad;
  let epoch = 0,
    disposed = false;
  let pending: Promise<unknown> = Promise.resolve();
  return {
    transcribeWords(audio: Float32Array) {
      const request = epoch,
        copy = new Float32Array(audio);
      const result = pending
        .then(async () => {
          if (disposed || request !== epoch) return [] as TimedWord[];
          if (!(await activity.detectVoice(copy)).length || disposed || request !== epoch)
            return [] as TimedWord[];
          const duration = copy.length / 16000;
          const aligned = await inferFluidAlignment(bundle, copy);
          if (disposed || request !== epoch) return [] as TimedWord[];
          const words = await wrapAsync(
            (value: Tokenizer, ids: number[], times: number[], duration: number): TimedWord[] => {
              'worklet';
              const words: TimedWord[] = [];
              let group: number[] = [];
              let start = 0;
              let end = 0;
              const flush = () => {
                const text = value.decode(new Int32Array(group)).trim();
                if (text) words.push({ text, start, end });
              };
              for (let i = 0; i < ids.length; i++) {
                if (value.idToToken(ids[i]).startsWith('▁') && group.length) {
                  flush();
                  group = [];
                }
                const time = Math.min(duration, times[i]);
                if (!group.length) start = time;
                end = Math.min(duration, time + 0.08);
                group.push(ids[i]);
              }
              if (group.length) flush();
              return words;
            }
          )(decoder, aligned.tokens, aligned.times, duration);
          return disposed || request !== epoch ? [] : words;
        })
        .finally(() => copy.fill(0));
      pending = result.catch(() => {});
      return result;
    },
    transcribeStop() {
      epoch++;
    },
    dispose() {
      if (disposed) return pending;
      disposed = true;
      epoch++;
      pending = pending.finally(release);
      return pending;
    },
  };
}
