import { splitLfmResponse } from '@/lib/chat/chat-tools';

export type ChatTurn = {
  question: string;
  responses: string[];
  pending: boolean;
  imageUri?: string;
  plainResponse?: boolean;
  error?: string;
  tools: { name: string; detail: string; arguments: Record<string, unknown>; pending?: boolean }[];
};

/** Updates the active display turn while preserving completed conversation entries. */
export function updateLastTurn(turns: ChatTurn[], update: (turn: ChatTurn) => ChatTurn) {
  return turns.map((turn, index) => (index === turns.length - 1 ? update(turn) : turn));
}

/** Joins reasoning across tool rounds and displays only the latest answer. */
export function presentChatTurn(turn: ChatTurn) {
  const rounds = turn.responses.map((response) => splitLfmResponse(response, !turn.plainResponse));
  const answer = rounds.at(-1)?.answer ?? '';
  const reasoning = rounds.at(-1)?.reasoning ?? !turn.plainResponse;
  const activity = !turn.pending
    ? 'idle'
    : turn.tools.some((tool) => tool.pending)
      ? 'tool'
      : answer
        ? 'answer'
        : reasoning && turn.responses.some(Boolean)
          ? 'thinking'
          : 'waiting';
  return {
    ...turn,
    activity,
    thinking: rounds
      .map((round) => round.thinking)
      .filter(Boolean)
      .join('\n\n'),
    answer,
    reasoning,
  };
}
