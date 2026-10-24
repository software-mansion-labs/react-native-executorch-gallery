import { useEffect, useRef, useState } from 'react';
import type { useLLMChatSession } from 'react-native-executorch';

import type { PickedImage } from '@/components/PhotoPicker';
import { updateLastTurn, type ChatTurn } from '@/lib/chat-presentation';

type ChatResult = Awaited<
  ReturnType<NonNullable<ReturnType<typeof useLLMChatSession>['sendMessage']>>
>;

/** Keeps image-chat drafts, streamed turns and cancellation recovery; ignores callbacks after unmount. */
export function useImageChatState() {
  const [draft, setDraft] = useState('');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const active = useRef(false);
  const current = useRef<{ question: string; image: PickedImage | null } | null>(null);
  const hasImageHistory = turns.some((turn) => turn.imageUri && !turn.pending && !turn.error);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current = false;
    };
  }, []);
  const begin = (question: string) => {
    if (active.current || !question || (!image && !hasImageHistory)) return false;
    active.current = true;
    current.current = { question, image };
    setBusy(true);
    setError(null);
    setDraft('');
    setImage(null);
    setTurns((items) => [
      ...items,
      {
        question,
        imageUri: image?.uri,
        responses: [''],
        pending: true,
        tools: [],
        plainResponse: true,
      },
    ]);
    return true;
  };
  const onToken = (token: string) => {
    if (!mounted.current || !active.current) return;
    setTurns((items) =>
      updateLastTurn(items, (turn) => ({ ...turn, responses: [(turn.responses[0] ?? '') + token] }))
    );
  };
  const restoreDraft = () => {
    if (!current.current) return;
    setDraft(current.current.question);
    setImage(current.current.image);
  };
  const complete = (result: ChatResult) => {
    if (!mounted.current) return;
    if (result.finishReason === 'cancelled') {
      setTurns((items) => items.slice(0, -1));
      restoreDraft();
    } else {
      const answer = [...result.messages].reverse().find((message) => message.role === 'assistant');
      const content = typeof answer?.content === 'string' ? answer.content : '';
      setTurns((items) =>
        updateLastTurn(items, (turn) => ({
          ...turn,
          pending: false,
          responses: [content],
          error: content.trim()
            ? undefined
            : 'The model stopped before producing a description. Try a shorter question.',
        }))
      );
    }
  };
  const fail = (cause: unknown) => {
    if (!mounted.current) return;
    setTurns((items) =>
      updateLastTurn(items, (turn) => ({
        ...turn,
        pending: false,
        error: cause instanceof Error ? cause.message : String(cause),
      }))
    );
    restoreDraft();
  };
  const finish = () => {
    active.current = false;
    current.current = null;
    if (mounted.current) setBusy(false);
  };
  const onPick = (photo: PickedImage | null) => {
    setImage(photo);
    setError(null);
  };
  return {
    draft,
    setDraft,
    image,
    turns,
    busy,
    error,
    setError,
    begin,
    onToken,
    complete,
    fail,
    finish,
    onPick,
    canSend: !!image || hasImageHistory,
  };
}
