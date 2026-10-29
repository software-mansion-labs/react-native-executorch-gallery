import { ChatDisclosure } from '@/components/chat/ChatDisclosure';
import { ChatText } from '@/components/chat/ChatText';

/** Keeps live reasoning separate from the answer, behind the same accordion as tool details. */
export function ChatThinking({
  text,
  active,
  onToggle,
}: {
  text: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <ChatDisclosure
      label={active ? 'Thinking…' : 'Thought process'}
      active={active}
      icon={active ? undefined : 'brain'}
      onToggle={onToggle}
    >
      <ChatText muted>{text || 'Working through your question…'}</ChatText>
    </ChatDisclosure>
  );
}
