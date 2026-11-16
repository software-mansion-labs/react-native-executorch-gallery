import { useMemo, type Dispatch, type RefObject, type SetStateAction } from 'react';

import { createChatTools, parseLfmToolCalls } from '@/lib/chat/chat-tools';
import { updateLastTurn, type ChatTurn } from '@/lib/chat/chat-presentation';

/** Tracks actual tool execution on the active turn, ignoring callbacks after cancellation or unmount. */
export function useChatTools(
  setTurns: Dispatch<SetStateAction<ChatTurn[]>>,
  active: RefObject<boolean>,
  mounted: RefObject<boolean>
) {
  return useMemo(() => {
    const tools = createChatTools(
      (name, detail, args) => {
        if (!mounted.current || !active.current) return;
        setTurns((items) =>
          updateLastTurn(items, (turn) => ({
            ...turn,
            responses: turn.responses.at(-1) ? [...turn.responses, ''] : turn.responses,
            tools: turn.tools.map((tool) =>
              tool.pending && tool.name === name
                ? { name, detail, arguments: args, pending: false }
                : tool
            ),
          }))
        );
      },
      (name, args) => {
        if (!mounted.current || !active.current) return;
        setTurns((items) =>
          updateLastTurn(items, (turn) => ({
            ...turn,
            tools: [...turn.tools, { name, detail: '', arguments: args, pending: true }],
          }))
        );
      }
    );
    return {
      tools,
      parseToolCalls: (text: string) => parseLfmToolCalls(text, tools, false),
      maxToolTurns: 4,
    };
  }, [setTurns, active, mounted]);
}
