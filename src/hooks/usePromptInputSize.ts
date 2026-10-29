import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

import { tokens } from '@/theme';

/** Measures a hidden text copy at the input's width, avoiding iOS multiline size under-reporting; caps height before enabling scrolling. */
export function usePromptInputSize(value: string) {
  const [contentHeight, setContentHeight] = useState(tokens.layout.touchTarget);
  const measured = value ? contentHeight : tokens.layout.touchTarget;
  const height = Math.max(
    tokens.layout.touchTarget,
    Math.min(tokens.layout.chatInputMaxHeight, measured)
  );
  const onMeasure = ({ nativeEvent: { layout } }: LayoutChangeEvent) => {
    if (Number.isFinite(layout.height) && layout.height > 0) {
      setContentHeight(Math.ceil(layout.height) + tokens.spacing.xxs);
    }
  };
  return { height, scrollEnabled: measured > tokens.layout.chatInputMaxHeight, onMeasure };
}
