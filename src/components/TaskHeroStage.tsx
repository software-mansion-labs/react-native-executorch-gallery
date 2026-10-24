import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { tokens } from '@/theme';

/** Keeps task copy at the same vertical anchor, independent of the controls below it. */
export function TaskHeroStage({ style, ...props }: ComponentProps<typeof Animated.View>) {
  return <Animated.View {...props} style={[styles.stage, style]} />;
}

const { spacing, layout } = tokens;
const styles = StyleSheet.create({
  stage: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: layout.photoControlSize + spacing.sm * 2 + spacing.lg,
  },
});
