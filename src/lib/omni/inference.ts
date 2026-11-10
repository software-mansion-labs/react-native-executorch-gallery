import { loadModel, tensor, nlp, type Tensor, type DType } from 'react-native-executorch';
import { createImagePreprocessor, type ImageBuffer } from 'react-native-executorch/cv';
import type { SharedValue } from 'react-native-reanimated';

export type OmniMode = 'text' | 'audio' | 'interleaved';
export type OmniInput = {
  prompt: string;
  mode: OmniMode;
  image?: ImageBuffer;
  audio?: Float32Array;
};
export type OmniResult = { text: string; audio: Float32Array; limited: boolean };

/** Run one independent Omni turn on a worklet, with fresh caches and explicit native ownership. */
export function runOmni(
  modelPath: string,
  tokenizerPath: string,
  input: OmniInput,
  cancelled: SharedValue<boolean>
): OmniResult {
  'worklet';
  const model = loadModel(modelPath, { eagerLoadMethods: false });
  let tokenizer: ReturnType<typeof nlp.loadTokenizer>;
  try {
    tokenizer = nlp.loadTokenizer(tokenizerPath);
  } catch (cause) {
    model.dispose();
    throw cause;
  }
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
    model.execute('token_embedding', [tokens], [output]);
    release(tokens);
    return output;
  };
  const check = () => {
    'worklet';
    if (cancelled.get()) throw new Error('Generation stopped.');
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
        model.execute('vision_encoder', [processor.process(input.image)], [output]);
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
      const length = Math.max(400, 400 + 160 * Math.ceil((input.audio.length - 400) / 160));
      if (length > 479920) throw new Error('Keep recordings under 29 seconds.');
      const samples = new Float32Array(length);
      samples.set(input.audio);
      const frames = Math.ceil(((length - 400) / 160 + 1) / 8);
      const wave = alloc('float32', [1, length], samples);
      const output = alloc('float32', [1, frames, 2048]);
      model.execute('audio_encoder', [wave], [output]);
      features.push({
        marker: '<|audio|>',
        count: frames,
        values: output.getData(new Float32Array(output.numel)),
      });
      release(wave);
      release(output);
    }
    check();
    const system =
      input.mode === 'audio'
        ? 'Perform TTS in American English using a female voice.'
        : input.mode === 'interleaved'
          ? 'Respond with interleaved text and audio.'
          : 'Respond in text.';
    let prompt = '<|startoftext|><|im_start|>system\n' + system + '<|im_end|>\n<|im_start|>user\n';
    for (const feature of features)
      prompt += '<|vision_start|>' + feature.marker.repeat(feature.count) + '<|vision_end|>';
    prompt += input.prompt + '<|im_end|>\n<|im_start|>assistant\n<think></think>';
    if (input.mode === 'audio') prompt += '<|audio_start|>';
    if (input.mode === 'interleaved') prompt += '<|mixed_start|>';
    const ids = Array.from(tokenizer.encode(prompt));
    if (ids.length + 512 > 4096) throw new Error('This input exceeds the demo context limit.');
    const logits = alloc('float32', [1, 128000]);
    const hidden = alloc('float32', [1, 2048]);
    let position = 0;
    const decode = (embedding: Tensor) => {
      'worklet';
      check();
      const n = embedding.shape[1];
      const positions = alloc(
        'int64',
        [n],
        BigInt64Array.from(Array.from({ length: n }, (_, i) => BigInt(position + i)))
      );
      model.execute('text_decoder', [embedding, positions], [logits, hidden]);
      position += n;
      release(positions);
      release(embedding);
    };
    const featureOffsets = features.map(() => 0);
    for (let start = 0; start < ids.length; start += 256) {
      const part = ids.slice(start, start + 256);
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
    const text: number[] = [];
    const frames: number[][] = [];
    let mode = input.mode;
    let speaking = false;
    let textDone = false;
    let slots = 6;
    let finished = false;
    const suppressed = [125029, 125030, 125031, 125032, 125012, 125015];
    const scores = new Float32Array(128000);
    for (let step = 0; step < 512 && frames.length < 256; step++) {
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
            model.execute('depth_decoder', [hidden, codeTensor, mask], [output]);
            const values = output.getData(new Float32Array(output.numel));
            for (const index of order.slice(pass * 4, pass * 4 + 4)) {
              const seen = new Set(frames.slice(-64).map((frame) => frame[index]));
              let max = -Infinity;
              for (let c = 0; c < 2017; c++) {
                let value = values[index * 2017 + c];
                if (seen.has(c)) value = value < 0 ? value * 1.2 : value / 1.2;
                values[index * 2017 + c] = value / 0.4;
                max = Math.max(max, value / 0.4);
              }
              let total = 0;
              for (let c = 0; c < 2017; c++) total += Math.exp(values[index * 2017 + c] - max);
              let pick = Math.random() * total;
              let selected = 2016;
              for (let c = 0; c < 2017; c++) {
                pick -= Math.exp(values[index * 2017 + c] - max);
                if (pick <= 0) {
                  selected = c;
                  break;
                }
              }
              codes[index] = selected;
              revealed[index] = 1;
            }
          }
          if (codes.includes(2016)) {
            codes.fill(2016);
            mode = 'text';
          } else frames.push(codes.slice());
          codeTensor.setData(BigInt64Array.from(codes.map((id) => BigInt(id))));
          next = alloc('float32', [1, 1, 2048]);
          model.execute('audio_embedding', [codeTensor], [next]);
        } finally {
          release(codeTensor);
          release(mask);
          release(output);
        }
      } else {
        logits.getData(scores);
        for (const id of suppressed) scores[id] = -Infinity;
        let token = 0;
        for (let i = 1; i < scores.length; i++) if (scores[i] > scores[token]) token = i;
        text.push(token);
        if (token === 124900 || (token === 125014 && !interleaving)) {
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
    let audio = new Float32Array(0);
    if (frames.length) {
      const packed = BigInt64Array.from(
        Array.from({ length: 12 * frames.length }, (_, i) =>
          BigInt(frames[i % frames.length][Math.floor(i / frames.length)])
        )
      );
      const codes = alloc('int64', [1, 12, frames.length], packed);
      const output = alloc('float32', [1, frames.length * 1920]);
      model.execute('audio_decoder', [codes], [output]);
      audio = output.getData(new Float32Array(output.numel));
    }
    return {
      text: tokenizer.decode(Int32Array.from(text), true).trim(),
      audio,
      limited: !finished,
    };
  } finally {
    owned.forEach((value) => value.dispose());
    tokenizer.dispose();
    model.dispose();
  }
}
