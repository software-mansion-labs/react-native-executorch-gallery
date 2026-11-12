// Streaming cache policy adapted from ExecuTorch Sortformer.
// Copyright (c) Meta Platforms, Inc. and affiliates. All rights reserved.
// BSD license and attribution: docs/sortformer-NOTICE.txt.
const WIDTH = 512;
const CACHE_FRAMES = 188;

export type SpeakerSpan = { start: number; end: number; speakers: number[] };
export type SpeakerMemory = { cache: Float32Array; fifo: Float32Array };
export const emptySpeakerMemory = (): SpeakerMemory => ({
  cache: new Float32Array(0),
  fifo: new Float32Array(0),
});

/** Groups frame decisions, preserving overlap and uncertain speech without guessing an identity. */
export function speakerSpans(probabilities: Float32Array, duration: number): SpeakerSpan[] {
  'worklet';
  const spans: SpeakerSpan[] = [];
  for (let frame = 0; frame < probabilities.length / 4; frame++) {
    const start = frame * 0.08;
    if (start >= duration) break;
    const speakers: number[] = [];
    for (let speaker = 0; speaker < 4; speaker++) {
      if (probabilities[frame * 4 + speaker] >= 0.5) speakers.push(speaker + 1);
    }
    const end = Math.min(duration, start + 0.08);
    const previous = spans[spans.length - 1];
    if (previous && previous.speakers.join() === speakers.join()) previous.end = end;
    else spans.push({ start, end, speakers });
  }
  return spans;
}

/** Keeps informative cache frames in chronological order, following the upstream ET runner. */
export function compressCache(embeddings: Float32Array, probabilities: Float32Array) {
  'worklet';
  const frames = embeddings.length / WIDTH;
  if (frames <= CACHE_FRAMES) return embeddings;
  const ranked = Array.from({ length: frames }, (_, i) => i);
  ranked.sort((a, b) => {
    let av = 0;
    let bv = 0;
    for (let s = 0; s < 4; s++) {
      av = Math.max(av, probabilities[a * 4 + s]);
      bv = Math.max(bv, probabilities[b * 4 + s]);
    }
    return bv - av || a - b;
  });
  const selected = ranked.slice(0, CACHE_FRAMES).sort((a, b) => a - b);
  const result = new Float32Array(CACHE_FRAMES * WIDTH);
  selected.forEach((frame, i) =>
    result.set(embeddings.subarray(frame * WIDTH, (frame + 1) * WIDTH), i * WIDTH)
  );
  return result;
}

/** Keeps a continuous voice in one ASR crop when another voice briefly overlaps.
 * The intersection identifies the continuously active track; the flag warns that its text is mixed.
 */
export function transcriptionSpans(spans: SpeakerSpan[]): (SpeakerSpan & { overlap: boolean })[] {
  const result: (SpeakerSpan & { overlap: boolean })[] = [];
  for (const span of spans) {
    const previous = result[result.length - 1];
    const common = previous?.speakers.filter((speaker) => span.speakers.includes(speaker)) ?? [];
    if (previous && common.length) {
      previous.end = span.end;
      previous.speakers = common;
      previous.overlap ||= span.speakers.length > 1;
    } else
      result.push({ ...span, speakers: [...span.speakers], overlap: span.speakers.length > 1 });
  }
  return result;
}
