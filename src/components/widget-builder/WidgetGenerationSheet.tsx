import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { ThinkingIndicator } from '@/components/ThinkingIndicator';
import { useWidgetRawOutput } from '@/hooks/widget-builder/useWidgetRawOutput';
import { widgetAppearance } from '@/lib/widget-builder/widget-appearance';
import { tokens } from '@/theme';

/** Shows indented streamed JSON while preserving generated text and incomplete or malformed output. */
export function WidgetGenerationSheet({
  visible,
  busy,
  readOutput,
  onClose,
}: {
  visible: boolean;
  busy: boolean;
  readOutput: () => string;
  onClose: () => void;
}) {
  const { output, scroll } = useWidgetRawOutput(readOutput, visible, busy);
  return (
    <BottomSheet
      title="Raw model output"
      visible={visible}
      onClose={onClose}
      scrollViewRef={scroll}
    >
      <View style={styles.body}>
        {output ? (
          <Animated.View key="output" entering={entrance}>
            <AppText variant="caption" selectable style={styles.output}>
              {output}
            </AppText>
          </Animated.View>
        ) : busy ? (
          <Animated.View key="waiting" entering={entrance} exiting={exit} style={styles.waiting}>
            <View>
              <ThinkingIndicator accessibilityLabel="Waiting for model output" />
            </View>
          </Animated.View>
        ) : (
          <AppText variant="secondary" tone="muted">
            No output yet
          </AppText>
        )}
      </View>
    </BottomSheet>
  );
}
const entrance = FadeIn.duration(tokens.motion.photoRevealDuration).reduceMotion(
  ReduceMotion.System
);
const exit = FadeOut.duration(tokens.motion.chatDisclosureFadeDuration).reduceMotion(
  ReduceMotion.System
);
const styles = StyleSheet.create({
  body: { minHeight: tokens.layout.touchTarget * 2, paddingBottom: tokens.spacing.lg },
  waiting: {
    height: tokens.layout.touchTarget * 2 - tokens.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  output: { fontFamily: widgetAppearance.fonts.mono },
});
