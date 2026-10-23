import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';

/** Copies the supplied text on request and returns success/error feedback plus a reset action. */
export function useCopyText(text: string) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = async () => {
    if (!text) return;
    setError(null);
    try {
      const success = await Clipboard.setStringAsync(text);
      if (!success) throw new Error('Could not copy text.');
      setCopiedText(text);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const reset = () => {
    setCopiedText(null);
    setError(null);
  };
  return { copied: !!text && copiedText === text, error, copy, reset };
}
