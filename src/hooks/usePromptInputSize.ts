import { useState } from 'react';
import { useWindowDimensions, type LayoutChangeEvent } from 'react-native';

import { tokens } from '@/theme';

/** Measures a hidden text copy at the input's width, avoiding iOS multiline size under-reporting; caps height before enabling scrolling. */
export function usePromptInputSize(value: string) {
  const { fontScale } = useWindowDimensions();
  const lineHeight = tokens.typography.promptInput.lineHeight * fontScale;
  const minHeight = Math.ceil(lineHeight);
  const maxHeight = Math.ceil(lineHeight * tokens.layout.promptMaxLines);
  const [contentHeight, setContentHeight] = useState(minHeight);
  const measured = value ? contentHeight : minHeight;
  const height = Math.max(minHeight, Math.min(maxHeight, measured));
  const onMeasure = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    if (Number.isFinite(layout.height) && layout.height > 0) {
      setContentHeight(Math.ceil(layout.height));
    }
  };
  return { height, scrollEnabled: measured > maxHeight, onMeasure };
}
