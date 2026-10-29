import { useMemo } from 'react';
import { nlp } from 'react-native-executorch';

const labels: Record<string, string> = {
  private_person: 'Name',
  private_email: 'Email',
  private_phone: 'Phone',
  private_address: 'Address',
  private_date: 'Date',
  private_url: 'URL',
  account_number: 'Account number',
  secret: 'Secret',
};

/** Splits detected spans with the library utility, preserving whitespace and deriving copyable redacted text. */
export function usePrivacyFilterPresentation(text: string, entities: readonly nlp.PiiEntity[]) {
  return useMemo(() => {
    const segments = nlp.piiSegments(text, entities).flatMap((segment) => {
      if (segment.kind === 'plain') return [{ text: segment.text, replacement: null }];
      const content = segment.text.trim();
      if (!content) return [{ text: segment.text, replacement: null }];
      const leading = segment.text.slice(0, segment.text.length - segment.text.trimStart().length);
      const trailing = segment.text.slice(segment.text.trimEnd().length);
      return [
        { text: leading, replacement: null },
        { text: content, replacement: `[${labels[segment.label] ?? 'Private detail'}]` },
        { text: trailing, replacement: null },
      ];
    });
    return {
      segments,
      redacted: segments.map((segment) => segment.replacement ?? segment.text).join(''),
      count: segments.filter((segment) => segment.replacement !== null).length,
    };
  }, [text, entities]);
}
