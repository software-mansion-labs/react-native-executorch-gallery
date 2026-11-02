import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { useGeneratingPulse } from '@/hooks/useGeneratingPulse';
import { tokens, useTheme, type Theme } from '@/theme';

/** A small, UI-thread text shimmer for prefill and widget assembly, respecting Reduce Motion. */
export function WidgetBuildLabel({
  appearance,
  palette,
}: {
  appearance?: Theme['scheme'];
  palette?: Pick<Theme['colors'], 'text' | 'muted'>;
}) {
  const theme = useTheme(appearance);
  const colors = palette ?? theme.colors;
  const [width, setWidth] = useState(0);
  const { phase, reducedMotion } = useGeneratingPulse();
  const shimmer = useAnimatedStyle(() => ({
    transform: [{ translateX: (phase.get() * 2 - 1) * width }],
    opacity: reducedMotion ? 0 : 1,
  }));
  const label = 'Creating your widget…';
  return (
    <View style={styles.label} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Animated.Text
        style={[
          styles.text,
          {
            color: colors.muted,
            transitionProperty: 'color',
            transitionDuration: reducedMotion ? 0 : tokens.motion.themeTransitionDuration,
          },
        ]}
        accessibilityLiveRegion="polite"
      >
        {label}
      </Animated.Text>
      <MaskedView
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        maskElement={
          <AppText appearance={appearance} variant="secondary">
            {label}
          </AppText>
        }
      >
        <Animated.View style={[StyleSheet.absoluteFill, shimmer]}>
          <LinearGradient
            colors={[colors.muted, colors.text, colors.muted]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </MaskedView>
    </View>
  );
}
const styles = StyleSheet.create({
  label: { alignSelf: 'flex-start' },
  text: { ...tokens.typography.secondary, fontFamily: tokens.fontFamily },
});
