import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { tokens, useTheme } from '@/theme';

/** A soft photographic sheen travels diagonally over the preview on the UI thread. */
export function MediaPreviewActivity({ width, height }: { width: number; height: number }) {
  const { media, logoShine } = useTheme();
  const phase = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const bandWidth = width * media.previewSheenWidthRatio;
  useEffect(() => {
    if (reducedMotion) return;
    phase.set(
      withRepeat(
        withTiming(1, {
          duration: tokens.media.previewSheenDuration,
          easing: Easing.linear,
          reduceMotion: ReduceMotion.System,
        }),
        -1,
        false
      )
    );
    return () => cancelAnimation(phase);
  }, [phase, reducedMotion]);
  const animation = useAnimatedStyle(() => ({
    opacity: Math.sin(phase.get() * Math.PI) * tokens.media.previewSheenOpacity,
    transform: [
      { translateX: phase.get() * (width + bandWidth * 3) },
      { rotate: `${tokens.media.previewSheenAngle}deg` },
    ],
  }));
  if (reducedMotion) return null;
  return (
    <Animated.View
      style={StyleSheet.absoluteFill}
      entering={entrance}
      exiting={exit}
      pointerEvents="none"
      accessible={false}
    >
      <Animated.View
        style={[
          styles.band,
          { width: bandWidth, height: height * 2, top: -height / 2, left: -bandWidth * 1.5 },
          animation,
        ]}
      >
        <LinearGradient
          colors={logoShine.colors}
          start={logoShine.start}
          end={logoShine.end}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}
const entrance = FadeIn.duration(tokens.motion.photoRevealDuration).reduceMotion(
  ReduceMotion.System
);
const exit = FadeOut.duration(tokens.motion.photoRevealDuration).reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({ band: { position: 'absolute' } });
