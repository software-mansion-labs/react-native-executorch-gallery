import type { TranscriptTurn } from './meeting';
import type { SpeakerSpan } from './speakerMemory';

export type TimedWord = { text: string; start: number; end: number };

/** Labels recognized words after ASR, without removing or changing their order/text.
 * Decoder emission times approximate word positions; they are not forced alignment.
 */
export function assignWordSpeakers(
  words: TimedWord[],
  spans: SpeakerSpan[],
  offset: number
): TranscriptTurn[] {
  const turns: TranscriptTurn[] = [];
  for (const word of words) {
    const votes = new Map<string, { seconds: number; speakers: number[] }>();
    for (const span of spans) {
      const seconds = Math.max(0, Math.min(word.end, span.end) - Math.max(word.start, span.start));
      if (!seconds) continue;
      const key = span.speakers.join(',');
      const vote = votes.get(key) ?? { seconds: 0, speakers: span.speakers };
      vote.seconds += seconds;
      votes.set(key, vote);
    }
    let best = 0;
    let speakers: number[] = [];
    for (const vote of votes.values()) {
      if (vote.seconds > best) {
        best = vote.seconds;
        speakers = vote.speakers;
      }
    }
    const previous = turns.at(-1);
    if (previous && previous.speakers.join(',') === speakers.join(',')) {
      previous.end = offset + word.end;
      previous.text += ` ${word.text}`;
    } else {
      turns.push({
        start: offset + word.start,
        end: offset + word.end,
        speakers: [...speakers],
        overlap: speakers.length > 1,
        text: word.text,
      });
    }
  }
  return turns;
}
