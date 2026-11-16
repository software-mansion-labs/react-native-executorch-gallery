import type { TranscriptTurn } from './meeting';

/** Groups consecutive identified speakers, including turns arriving in separate audio chunks. */
export function appendTranscriptTurns(
  previous: TranscriptTurn[],
  incoming: TranscriptTurn[]
): TranscriptTurn[] {
  const turns = [...previous];
  for (const turn of incoming) {
    const last = turns.at(-1);
    if (
      last &&
      last.speakers.length > 0 &&
      last.speakers.length === turn.speakers.length &&
      last.speakers.every((speaker) => turn.speakers.includes(speaker))
    ) {
      turns[turns.length - 1] = {
        ...last,
        end: Math.max(last.end, turn.end),
        text: [last.text?.trim(), turn.text?.trim()].filter(Boolean).join(' '),
        overlap: last.overlap || turn.overlap,
      };
    } else {
      turns.push(turn);
    }
  }
  return turns;
}
