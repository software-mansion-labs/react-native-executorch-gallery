import { loadModel, nlp, schema, wrapAsync, type llm } from 'react-native-executorch';
import { createSynchronizable } from 'react-native-worklets';

import {
  generateOmniTurn,
  replayOmni,
  type OmniInput,
  type OmniMode,
  type OmniLimits,
  type OmniGenerationConfig,
  type OmniReplay,
  type OmniTurnResult,
} from './inference';

const sequence = schema.DynamicDim('sequence');
const frames = schema.DynamicDim('frames');
const OMNI_SPEC = {
  ...schema.method('token_embedding', [schema.i64(1, sequence)], [schema.f32(1, sequence, 2048)]),
  ...schema.method(
    'text_decoder',
    [schema.f32(1, sequence, 2048), schema.i64(sequence)],
    [schema.f32(1, 128000), schema.f32(1, 2048)]
  ),
  ...schema.method('vision_encoder', [schema.f32(1, 3, 512, 512)], [schema.f32(1, 256, 2048)]),
  ...schema.method(
    'audio_encoder',
    [schema.f32(1, schema.DynamicDim('samples'))],
    [schema.f32(1, schema.DynamicDim('audioFeatures'), 2048)]
  ),
  ...schema.method(
    'depth_decoder',
    [schema.f32(1, 2048), schema.i64(1, 12), schema.bool(1, 12)],
    [schema.f32(1, 12, 2017)]
  ),
  ...schema.method('audio_embedding', [schema.i64(1, 12)], [schema.f32(1, 1, 2048)]),
  ...schema.method(
    'audio_decoder',
    [schema.i64(1, 12, frames)],
    [schema.f32(1, schema.DynamicDim('outputSamples'))]
  ),
};

export type OmniRunner = {
  readonly modelPath: string;
  readonly tokenizerPath: string;
  readonly modalities: readonly ['image', 'audio'];
  generate(
    input: Omit<OmniInput, 'mode'>,
    onAudioChunk?: (samples: Float32Array, final: boolean) => void,
    options?: OmniGenerationConfig,
    onText?: (text: string) => void
  ): Promise<OmniTurnResult>;
  getKVCacheState(): llm.LLMKVCacheState;
  stop(): void;
  reset(): Promise<void>;
  dispose(): void;
};

/**
 * Gallery-owned counterpart of createLLMRunner for Omni's seven-method contract.
 * Owns one model/tokenizer, validates its spec, and appends turns to native caches.
 * Cancellation discards the partial turn; the next request rebuilds committed
 * convolution/KV state from retained embeddings. Reset reloads once, never per turn.
 */
export async function createOmniRunner(
  config: { modelPath: string; tokenizerPath: string },
  mode: OmniMode = 'interleaved'
): Promise<OmniRunner> {
  const load = wrapAsync(loadModel);
  const generate = wrapAsync(generateOmniTurn);
  const replay = wrapAsync(replayOmni);
  let model: ReturnType<typeof loadModel> | undefined;
  let tokenizer: ReturnType<typeof nlp.loadTokenizer> | undefined;
  const position = createSynchronizable(0);
  const cancelled = createSynchronizable(false);
  let journal: Float32Array[] = [];
  let active = false;
  let operation = 0;
  let disposed = false;
  let dirty = false;
  let maxContextLen = 0;
  let limits: OmniLimits;
  const release = () => {
    const current = model;
    model = undefined;
    current?.dispose();
  };
  const reload = async (committed: OmniReplay) => {
    release();
    const loaded = await load(config.modelPath, { eagerLoadMethods: false });
    model = loaded;
    const { dim } = schema.validateSpec(loaded.schema, { omni: OMNI_SPEC });
    limits = {
      maxPrefillLen: dim('sequence', 'range').max,
      codecMaxFrames: dim('frames', 'range').max,
      audioSamples: dim('samples', 'range'),
    };
    if (committed.length) await replay(loaded, committed, cancelled, limits.maxPrefillLen);
  };
  const assertIdle = () => {
    if (disposed) throw new Error('Omni runner has been disposed.');
    if (active) throw new Error('Omni runner is already processing a request.');
  };
  try {
    await reload([]);
    tokenizer = await wrapAsync(nlp.loadTokenizer)(config.tokenizerPath);
    maxContextLen = model!.execute('get_max_context_len', [], [])[0] as number;
    if (!Number.isInteger(maxContextLen) || maxContextLen < limits!.maxPrefillLen)
      throw new Error('Omni model has an invalid context capacity.');
  } catch (cause) {
    release();
    tokenizer?.dispose();
    throw cause;
  }
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    cancelled.setBlocking(true);
    if (!active) {
      release();
      tokenizer?.dispose();
      journal = [];
    }
  };
  return {
    ...config,
    modalities: ['image', 'audio'],
    getKVCacheState: () => {
      const pos = position.getBlocking();
      return {
        pos,
        maxContextLen,
        remainingTokens: maxContextLen - pos,
        usageRatio: pos / maxContextLen,
      };
    },
    stop: () => cancelled.setBlocking(true),
    dispose,
    reset: async () => {
      assertIdle();
      active = true;
      cancelled.setBlocking(false);
      journal = [];
      position.setBlocking(0);
      dirty = true;
      try {
        await reload([]);
        dirty = false;
      } finally {
        active = false;
        if (disposed) {
          release();
          tokenizer?.dispose();
        }
      }
    },
    generate: async (input, onAudioChunk, options = {}, onText) => {
      assertIdle();
      active = true;
      cancelled.setBlocking(false);
      const checkpoint = position.getBlocking();
      const request = ++operation;
      let firstAudioLogged = false;
      const stream = onAudioChunk
        ? (samples: Float32Array, final: boolean) => {
            if (request === operation && !disposed && !cancelled.getBlocking()) {
              if (__DEV__ && !firstAudioLogged) {
                firstAudioLogged = true;
                console.info(
                  '[Omni] First speech chunk generated; playback buffering is separate.'
                );
              }
              onAudioChunk(samples, final);
            }
          }
        : undefined;
      try {
        if (dirty) {
          const started = Date.now();
          if (__DEV__)
            console.info(
              `[Omni] Restoring ${checkpoint} cached positions after cancellation/error.`
            );
          await reload(journal);
          dirty = false;
          if (__DEV__) console.info(`[Omni] Cache restored in ${Date.now() - started} ms.`);
        }
        if (__DEV__) console.info(`[Omni] New turn; continuing from cache position ${checkpoint}.`);
        const result = await generate(
          model!,
          tokenizer!,
          { ...input, mode },
          cancelled,
          position,
          maxContextLen,
          limits!,
          options,
          stream,
          onText
            ? (text: string) => {
                if (request === operation && !disposed && !cancelled.getBlocking()) onText(text);
              }
            : undefined
        );
        if (cancelled.getBlocking() || disposed) throw new Error('Generation stopped.');
        if (__DEV__)
          console.info('[Omni] Turn timings:', {
            prefillTokens: result.stats.prefillTokens,
            prefillMs: result.stats.prefillMs,
            firstAudioMs: result.stats.firstAudioMs,
            audioSeconds: result.audioFrames * 0.08,
            codecMs: result.stats.codecMs,
            generationMs: result.stats.generationMs,
            generationRtf: result.audioFrames
              ? result.stats.generationMs / (result.audioFrames * 80)
              : null,
            methodTimings: result.stats.methodTimings,
            maxCodecWindowFrames: result.stats.maxCodecWindowFrames,
            limited: result.limited,
          });
        if (mode !== 'text' && !result.audio.length)
          throw new Error('No speech was generated. Try a shorter question.');
        journal = [...journal, ...result.journal];
        return result;
      } catch (cause) {
        dirty = true;
        position.setBlocking(checkpoint);
        throw cause;
      } finally {
        active = false;
        if (disposed) {
          release();
          tokenizer?.dispose();
          journal = [];
        }
      }
    },
  };
}
