export type SpeakerSpan = { start: number; end: number; speakers: number[] };
/** Groups frame decisions, preserving overlap and uncertain speech without guessing an identity. */
export function speakerSpans(
  probabilities: Float32Array,
  duration: number,
  numSpeakers = 8,
  frameStride = 0.01
): SpeakerSpan[] {
  'worklet';
  const spans: SpeakerSpan[] = [];
  for (let frame = 0; frame < probabilities.length / numSpeakers; frame++) {
    const start = frame * frameStride;
    if (start >= duration) break;
    const speakers: number[] = [];
    for (let speaker = 0; speaker < numSpeakers; speaker++) {
      if (probabilities[frame * numSpeakers + speaker] >= 0.5) speakers.push(speaker + 1);
    }
    const end = Math.min(duration, start + frameStride);
    const previous = spans[spans.length - 1];
    if (previous && previous.speakers.join() === speakers.join()) previous.end = end;
    else spans.push({ start, end, speakers });
  }
  return spans;
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

/** Fills only brief unassigned gaps bounded by the same identified speaker set.
 * Known speaker changes and longer silence remain untouched; input spans are never mutated.
 */
export function bridgeSpeakerGaps(spans: SpeakerSpan[]): SpeakerSpan[] {
  return spans.map((span, index) => {
    const before = spans[index - 1];
    const after = spans[index + 1];
    if (
      !span.speakers.length &&
      span.end - span.start <= 0.25 + 1e-9 &&
      before?.speakers.length &&
      after &&
      Math.abs(before.end - span.start) < 1e-9 &&
      Math.abs(span.end - after.start) < 1e-9 &&
      before.speakers.join(',') === after.speakers.join(',')
    ) {
      return { ...span, speakers: [...before.speakers] };
    }
    return span;
  });
}
