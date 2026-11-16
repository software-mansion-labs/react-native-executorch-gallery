import {
  tensor,
  llm,
  type loadModel,
  type nlp,
  type Tensor,
  type DType,
} from 'react-native-executorch';
import { createImagePreprocessor, type ImageBuffer } from 'react-native-executorch/cv';
import { scheduleOnRN, type Synchronizable } from 'react-native-worklets';

import { decodeOmniAudioWindow, OMNI_CODEC_CONTEXT_FRAMES } from './codec';

export type OmniMode = 'text' | 'audio' | 'interleaved';
export type OmniInput = {
  prompt: string;
  mode: OmniMode;
  image?: ImageBuffer;
  audio?: Float32Array;
};
export type OmniResult = {
  text: string;
  audio: Float32Array;
  limited: boolean;
  finishReason?: 'stop' | 'context' | 'maxTokens';
};
export type OmniLimits = {
  maxPrefillLen: number;
  codecMaxFrames: number;
  audioSamples: { min: number; max: number; step: number };
};
export type OmniGenerationConfig = {
  maxNewTokens?: number;
  prefillLen?: number;
  audioChunkFrames?: number | 'max';
};

export type OmniReplay = readonly Float32Array[];
export type OmniTurnResult = OmniResult & {
  position: number;
  audioCodes: Int32Array;
  audioFrames: number;
  journal: Float32Array[];
  stats: {
    prefillTokens: number;
    prefillMs: number;
    generationSteps: number;
    generationMs: number;
    codecMs: number;
    firstAudioMs: number | null;
    maxCodecWindowFrames: number;
    methodTimings: Record<string, { calls: number; ms: number }>;
  };
};

/** Advance a loaded Omni model on its worklet, retaining native KV/convolution state. */
export function generateOmniTurn(
  model: ReturnType<typeof loadModel>,
  tokenizer: ReturnType<typeof nlp.loadTokenizer>,
  input: OmniInput,
  cancelled: Synchronizable<boolean>,
  cachePosition: Synchronizable<number>,
  maxContextLen: number,
  limits: OmniLimits,
  config: OmniGenerationConfig = {},
  onAudioChunk?: (samples: Float32Array, final: boolean) => void,
  onText?: (text: string) => void
): OmniTurnResult {
  'worklet';
  const turnStarted = Date.now();
  const prefillLen = config.prefillLen ?? limits.maxPrefillLen;
  const maxNewTokens = config.maxNewTokens ?? Infinity;
  if (!Number.isInteger(prefillLen) || prefillLen < 1 || prefillLen > limits.maxPrefillLen)
    throw new Error('Prefill length must fit the exported sequence range.');
  if (maxNewTokens !== Infinity && (!Number.isInteger(maxNewTokens) || maxNewTokens < 1))
    throw new Error('maxNewTokens must be a positive integer.');
  const maxCodecBatchFrames = limits.codecMaxFrames - OMNI_CODEC_CONTEXT_FRAMES;
  const codecBatchFrames =
    config.audioChunkFrames === 'max'
      ? maxCodecBatchFrames
      : (config.audioChunkFrames ?? Math.min(3, maxCodecBatchFrames));
  if (!Number.isInteger(codecBatchFrames) || codecBatchFrames > maxCodecBatchFrames)
    throw new Error('Audio chunk length must fit the exported codec range.');
  if (codecBatchFrames < 1)
    throw new Error('Exported codec window is too short for causal decoding.');
  const methodTimings: Record<string, { calls: number; ms: number }> = {};
  const execute = (method: string, inputs: Tensor[], outputs: Tensor[]) => {
    'worklet';
    const started = Date.now();
    const result = model.execute(method, inputs, outputs);
    const timing = (methodTimings[method] ??= { calls: 0, ms: 0 });
    timing.calls++;
    timing.ms += Date.now() - started;
    return result;
  };
  const sample = (...args: Parameters<typeof llm.sample>) => {
    'worklet';
    const started = Date.now();
    const token = llm.sample(...args);
    const timing = (methodTimings.sampling ??= { calls: 0, ms: 0 });
    timing.calls++;
    timing.ms += Date.now() - started;
    return token;
  };
  const journal: Float32Array[] = [];
  const owned: Tensor[] = [];
  const alloc = (
    dtype: DType,
    shape: number[],
    data?: Float32Array | BigInt64Array | Uint8Array
  ) => {
    'worklet';
    const value = tensor(dtype, shape, data);
    owned.push(value);
    return value;
  };
  const release = (value: Tensor) => {
    'worklet';
    value.dispose();
    const index = owned.indexOf(value);
    if (index >= 0) owned.splice(index, 1);
  };
  const idsTensor = (ids: number[]) => {
    'worklet';
    return alloc('int64', [1, ids.length], BigInt64Array.from(ids.map((id) => BigInt(id))));
  };
  const embed = (ids: number[]) => {
    'worklet';
    const tokens = idsTensor(ids);
    const output = alloc('float32', [1, ids.length, 2048]);
    execute('token_embedding', [tokens], [output]);
    release(tokens);
    return output;
  };
  const check = () => {
    'worklet';
    if (cancelled.getBlocking()) throw new Error('Generation stopped.');
  };
  try {
    const features: { marker: string; count: number; values: Float32Array }[] = [];
    if (input.image) {
      const processor = createImagePreprocessor(
        { resizeMode: 'stretch', interpolation: 'linear', normalizeOpts: { alpha: 1, beta: 0 } },
        [1, 3, 512, 512]
      );
      try {
        const output = alloc('float32', [1, 256, 2048]);
        execute('vision_encoder', [processor.process(input.image)], [output]);
        features.push({
          marker: '<|image|>',
          count: 256,
          values: output.getData(new Float32Array(output.numel)),
        });
        release(output);
      } finally {
        processor.dispose();
      }
    }
    if (input.audio?.length) {
      const { min: window, max: maxSamples, step: hop } = limits.audioSamples;
      const stride = maxSamples - window + hop;
      const blocks: Float32Array[] = [];
      let totalFrames = 0;
      for (let offset = 0; offset < input.audio.length; offset += stride) {
        check();
        const count = Math.min(input.audio.length - offset, stride);
        const length = count <= window ? window : window + Math.ceil((count - window) / hop) * hop;
        const samples = new Float32Array(length);
        samples.set(input.audio.subarray(offset, offset + count));
        // This checkpoint pools eight spectrogram hops per language embedding.
        const frames = Math.ceil((1 + (length - window) / hop) / 8);
        if (cachePosition.getBlocking() + totalFrames + frames + 16 >= maxContextLen)
          throw new Error('Audio exceeds the remaining conversation context.');
        const wave = alloc('float32', [1, length], samples);
        const output = alloc('float32', [1, frames, 2048]);
        try {
          execute('audio_encoder', [wave], [output]);
          blocks.push(output.getData(new Float32Array(output.numel)));
          totalFrames += frames;
        } finally {
          release(wave);
          release(output);
        }
      }
      const values = new Float32Array(totalFrames * 2048);
      let offset = 0;
      for (const block of blocks) {
        values.set(block, offset);
        offset += block.length;
      }
      features.push({ marker: '<|audio|>', count: totalFrames, values });
    }
    check();
    const system =
      input.mode === 'audio'
        ? 'Perform TTS in American English using a female voice.'
        : input.mode === 'interleaved'
          ? 'Respond with interleaved text and audio.'
          : 'Respond in text.';
    const startPosition = cachePosition.getBlocking();
    let prompt =
      startPosition === 0
        ? '<|startoftext|><|im_start|>system\n' + system + '<|im_end|>\n<|im_start|>user\n'
        : '\n<|im_start|>user\n';
    for (const feature of features)
      prompt += '<|vision_start|>' + feature.marker.repeat(feature.count) + '<|vision_end|>';
    // Omni is non-reasoning. Its canonical template requires this already-closed,
    // empty think block; it does not enable reasoning or generate thinking tokens.
    prompt += input.prompt + '<|im_end|>\n<|im_start|>assistant\n<think></think>';
    if (input.mode === 'audio') prompt += '<|audio_start|>';
    if (input.mode === 'interleaved') prompt += '<|mixed_start|>';
    const ids = Array.from(tokenizer.encode(prompt));
    if (startPosition + ids.length + 2 >= maxContextLen)
      throw new Error('Conversation context is full. Start a new chat to continue.');
    const logits = alloc('float32', [1, 128000]);
    const hidden = alloc('float32', [1, 2048]);
    const decode = (embedding: Tensor) => {
      'worklet';
      check();
      const n = embedding.shape[1];
      const position = cachePosition.getBlocking();
      const positions = alloc(
        'int64',
        [n],
        BigInt64Array.from(Array.from({ length: n }, (_, i) => BigInt(position + i)))
      );
      const values = embedding.getData(new Float32Array(embedding.numel));
      execute('text_decoder', [embedding, positions], [logits, hidden]);
      journal.push(values);
      cachePosition.setBlocking(position + n);
      release(positions);
      release(embedding);
    };
    const prefillStarted = Date.now();
    const featureOffsets = features.map(() => 0);
    for (let start = 0; start < ids.length; start += prefillLen) {
      const part = ids.slice(start, start + prefillLen);
      const embedding = embed(part);
      if (features.length) {
        const data = embedding.getData(new Float32Array(embedding.numel));
        for (let i = 0; i < part.length; i++) {
          features.forEach((feature, index) => {
            if (part[i] === tokenizer.tokenToId(feature.marker)) {
              const offset = featureOffsets[index]++ * 2048;
              data.set(feature.values.subarray(offset, offset + 2048), i * 2048);
            }
          });
        }
        embedding.setData(data);
      }
      decode(embedding);
    }
    const prefillMs = Date.now() - prefillStarted;
    const generationStarted = Date.now();
    const generationStartPosition = cachePosition.getBlocking();
    const text: number[] = [];
    let preview = '';
    let previewAt = 0;
    const frames: number[][] = [];
    const speech = {
      emitted: 0,
      decodedFrames: 0,
      chunks: [] as Float32Array[],
      codecMs: 0,
      firstAudioMs: -1,
      maxWindowFrames: 0,
    };
    const flushAudio = (final: boolean) => {
      'worklet';
      if (!frames.length) {
        if (final && onAudioChunk) scheduleOnRN(onAudioChunk, new Float32Array(0), true);
        return;
      }
      const decoded = decodeOmniAudioWindow(
        model,
        frames,
        speech.emitted,
        limits.codecMaxFrames,
        final
      );
      speech.codecMs += decoded.durationMs;
      const codecTiming = (methodTimings.audio_decoder ??= { calls: 0, ms: 0 });
      codecTiming.calls++;
      codecTiming.ms += decoded.durationMs;
      speech.maxWindowFrames = Math.max(speech.maxWindowFrames, decoded.windowFrames);
      speech.decodedFrames = frames.length;
      speech.emitted = decoded.emittedSamples;
      if (decoded.samples.length) {
        speech.chunks.push(decoded.samples);
        if (speech.firstAudioMs < 0) speech.firstAudioMs = Date.now() - turnStarted;
      }
      // End-of-stream is independent of whether the final codec call emitted PCM.
      if (onAudioChunk && (decoded.samples.length || final))
        scheduleOnRN(onAudioChunk, decoded.samples, final);
    };

    let mode = input.mode;
    let speaking = false;
    let textDone = false;
    let slots = 6;
    let finished = false;
    const suppressed = [125029, 125030, 125031, 125032, 125012, 125015];
    const codebookLogits = alloc('float32', [1, 2017]);
    for (
      let step = 0;
      step < maxNewTokens && cachePosition.getBlocking() < maxContextLen - 2;
      step++
    ) {
      check();
      const interleaving = mode === 'interleaved';
      let next: Tensor;
      if (mode === 'audio' || (interleaving && speaking)) {
        const codes = new Array<number>(12).fill(0);
        const revealed = new Uint8Array(12);
        const order = Array.from({ length: 12 }, (_, i) => i);
        for (let i = 11; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [order[i], order[j]] = [order[j], order[i]];
        }
        const codeTensor = alloc('int64', [1, 12]);
        const mask = alloc('bool', [1, 12]);
        const output = alloc('float32', [1, 12, 2017]);
        try {
          for (let pass = 0; pass < 3; pass++) {
            codeTensor.setData(BigInt64Array.from(codes.map((id) => BigInt(id))));
            mask.setData(Uint8Array.from(revealed, (value) => 1 - value));
            execute('depth_decoder', [hidden, codeTensor, mask], [output]);
            const values = output.getData(new Float32Array(output.numel));
            for (const index of order.slice(pass * 4, pass * 4 + 4)) {
              codebookLogits.setData(values.subarray(index * 2017, (index + 1) * 2017));
              codes[index] = sample(
                codebookLogits,
                {
                  generatedTokens: Int32Array.from(frames.slice(-64), (frame) => frame[index]),
                },
                {
                  temperature: 0.4,
                  repetitionPenalty: 1.2,
                  penaltyLastN: 64,
                  topK: 2017,
                  topP: 1,
                  minP: 0,
                }
              );
              revealed[index] = 1;
            }
          }
          if (codes.includes(2016)) {
            codes.fill(2016);
            mode = 'text';
          } else {
            frames.push(codes.slice());
            // Each codec invocation stays in range; total speech can exceed that range.
            // Small startup chunks expose early audio. Larger later batches
            // reduce repeated causal context decoding during playback.
            const batchFrames =
              config.audioChunkFrames !== 'max' && speech.emitted < 12000
                ? Math.min(3, codecBatchFrames)
                : codecBatchFrames;
            if (
              (config.audioChunkFrames !== 'max' && frames.length === 1) ||
              frames.length - speech.decodedFrames >= batchFrames
            )
              flushAudio(false);
          }
          codeTensor.setData(BigInt64Array.from(codes.map((id) => BigInt(id))));
          next = alloc('float32', [1, 1, 2048]);
          execute('audio_embedding', [codeTensor], [next]);
        } finally {
          release(codeTensor);
          release(mask);
          release(output);
        }
      } else {
        const token = sample(
          logits,
          { generatedTokens: Int32Array.from(text) },
          {
            temperature: 0,
            topK: 1,
            topP: 1,
            minP: 0,
            repetitionPenalty: 1,
            constraints: () => {
              'worklet';
              return { bannedTokens: Int32Array.from(suppressed) };
            },
          }
        );
        text.push(token);
        const previewNow = Date.now();
        if (
          onText &&
          (!preview ||
            previewNow - previewAt >= 80 ||
            slots === 1 ||
            token === 125014 ||
            token === 124900)
        ) {
          const rendered = tokenizer.decode(Int32Array.from(text), true).trimStart();
          // Delay an incomplete UTF-8 sequence until its remaining tokens arrive.
          if (rendered !== preview && !rendered.endsWith('\uFFFD')) {
            preview = rendered;
            previewAt = previewNow;
            scheduleOnRN(onText, rendered);
          }
        }
        if (token === 124900 || (token === 125014 && !interleaving)) {
          decode(embed([token]));
          if (token !== 124900) decode(embed([124900]));
          finished = true;
          break;
        }
        if (token === 125014 && interleaving) {
          textDone = true;
          speaking = true;
        }
        next = embed([token]);
      }
      if (interleaving && !textDone && --slots === 0) {
        speaking = !speaking;
        slots = speaking ? 12 : 6;
      }
      decode(next);
    }
    check();
    if (!finished) decode(embed([124900]));
    flushAudio(true);
    const generationMs = Date.now() - generationStarted;
    const pcm = new Float32Array(speech.emitted);
    let pcmOffset = 0;
    for (const chunk of speech.chunks) {
      pcm.set(chunk, pcmOffset);
      pcmOffset += chunk.length;
    }
    const audioCodes = Int32Array.from(
      Array.from(
        { length: 12 * frames.length },
        (_, i) => frames[i % frames.length][Math.floor(i / frames.length)]
      )
    );
    return {
      text: tokenizer.decode(Int32Array.from(text), true).trim(),
      audio: pcm,
      audioCodes,
      audioFrames: frames.length,
      limited: !finished,
      finishReason: finished
        ? 'stop'
        : cachePosition.getBlocking() >= maxContextLen - 2
          ? 'context'
          : 'maxTokens',
      position: cachePosition.getBlocking(),
      journal,
      stats: {
        prefillTokens: ids.length,
        prefillMs,
        generationSteps: cachePosition.getBlocking() - generationStartPosition,
        generationMs,
        codecMs: speech.codecMs,
        firstAudioMs: speech.firstAudioMs < 0 ? null : speech.firstAudioMs,
        maxCodecWindowFrames: speech.maxWindowFrames,
        methodTimings,
      },
    };
  } finally {
    owned.forEach((value) => value.dispose());
  }
}

/** Rebuild committed state in schema-sized embedding batches after cancellation. */
export function replayOmni(
  model: ReturnType<typeof loadModel>,
  journal: OmniReplay,
  cancelled: Synchronizable<boolean>,
  prefillLen: number
): void {
  'worklet';
  const logits = tensor('float32', [1, 128000]);
  const hidden = tensor('float32', [1, 2048]);
  const batch = new Float32Array(prefillLen * 2048);
  const state = { used: 0, position: 0 };
  const flush = () => {
    'worklet';
    if (cancelled.getBlocking()) throw new Error('Generation stopped.');
    const count = state.used / 2048;
    const embedding = tensor('float32', [1, count, 2048], batch.slice(0, state.used));
    const positions = tensor(
      'int64',
      [count],
      BigInt64Array.from({ length: count }, (_, i) => BigInt(state.position + i))
    );
    try {
      model.execute('text_decoder', [embedding, positions], [logits, hidden]);
      state.position += count;
      state.used = 0;
    } finally {
      embedding.dispose();
      positions.dispose();
    }
  };
  try {
    for (const values of journal) {
      let offset = 0;
      while (offset < values.length) {
        const count = Math.min(batch.length - state.used, values.length - offset);
        batch.set(values.subarray(offset, offset + count), state.used);
        state.used += count;
        offset += count;
        if (state.used === batch.length) flush();
      }
    }
    if (state.used) flush();
  } finally {
    logits.dispose();
    hidden.dispose();
  }
}
