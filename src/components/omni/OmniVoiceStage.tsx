import { useEffect, useRef } from 'react';
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated, {
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { TaskHero } from '@/components/TaskHero';
import { useCircularButtonPressAnimation } from '@/hooks/useCircularButtonPressAnimation';
import { useFadingVisibility } from '@/hooks/useFadingVisibility';
import { tokens, useTheme } from '@/theme';

import {
  OMNI_ORB_MAX_RADIUS,
  OMNI_ORB_SHADER,
  omniOrbRadius,
  omniOrbShape,
} from '@/lib/omni/orbShader';

const effect = Skia.RuntimeEffect.Make(OMNI_ORB_SHADER);

/** Harmonic cloud orb whose outline responds to microphone and playback energy. */
export function OmniVoiceStage({
  recording,
  starting,
  generating,
  playing,
  buffering,
  paused = false,
  level,
  onPress,
}: {
  recording: boolean;
  starting: boolean;
  generating: boolean;
  playing: boolean;
  buffering: boolean;
  paused?: boolean;
  level: SharedValue<number>;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const { mounted: orbMounted, style: orbStyle } = useFadingVisibility(!paused);
  const press = useCircularButtonPressAnimation(starting);
  const touchingOrb = useRef(false);
  const insideOrb = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const x = (locationX - orbDiameter / 2) / (tokens.layout.voiceOrbSize / 2);
    const y = (locationY - orbDiameter / 2) / (tokens.layout.voiceOrbSize / 2);
    const radius = omniOrbRadius(
      Math.atan2(y, x),
      time.get(),
      reducedMotion ? 0 : level.get(),
      activity.get()
    );
    return x * x + y * y <= radius * radius;
  };
  const time = useSharedValue(0);
  const frameElapsed = useSharedValue(0);
  const activity = useSharedValue(0);
  const swirl = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    const duration = reducedMotion ? 0 : 600;
    activity.set(withTiming(recording || playing || generating ? 1 : 0, { duration }));
    swirl.set(withTiming(generating && !playing ? 1 : recording ? 0.35 : 0, { duration }));
    if (generating) {
      pulse.set(1);
      pulse.set(withTiming(0, { duration: reducedMotion ? 0 : 1000 }));
    }
  }, [recording, playing, generating, reducedMotion, activity, swirl, pulse]);
  useFrameCallback((frame) => {
    if (!reducedMotion && orbMounted) {
      const elapsed = frameElapsed.get() + Math.min(frame.timeSincePreviousFrame ?? 16, 50);
      // Preserve motion speed while leaving more rendering time for inference.
      if (elapsed < (generating ? 1000 / 30 : 1000 / 60)) {
        frameElapsed.set(elapsed);
        return;
      }
      time.set(time.get() + (elapsed / 1000) * (1.25 + activity.get() * 1.0 + swirl.get() * 0.85));
      frameElapsed.set(0);
    } else frameElapsed.set(0);
  });
  const deep = Array.from(Skia.Color(colors.orbDeep));
  const mist = Array.from(Skia.Color(colors.orbMist));
  const cloud = Array.from(Skia.Color(colors.orbCloud));
  const uniforms = useDerivedValue(() => ({
    size: tokens.layout.voiceOrbSize,
    time: time.get(),
    energy: reducedMotion ? 0 : level.get(),
    activity: activity.get(),
    swirl: swirl.get(),
    pulse: pulse.get(),
    ...omniOrbShape(time.get(), reducedMotion ? 0 : level.get(), activity.get()),
    deep,
    mist,
    cloud,
  }));
  const status = starting
    ? 'Opening microphone…'
    : recording
      ? 'Listening…'
      : playing
        ? 'Speaking…'
        : buffering
          ? 'Thinking…'
          : generating
            ? 'Thinking…'
            : 'Talk to me';
  const label = recording
    ? 'Send voice question'
    : playing
      ? 'Stop speaking'
      : generating || buffering
        ? 'Cancel response'
        : 'Start talking';
  return (
    <View style={styles.stage} pointerEvents="box-none">
      <View style={styles.orbArea} pointerEvents="box-none">
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: starting, busy: generating }}
          disabled={starting}
          onPress={(event) => {
            if (insideOrb(event)) onPress();
          }}
          onAccessibilityTap={onPress}
          onPressIn={(event) => {
            touchingOrb.current = insideOrb(event);
            if (touchingOrb.current) press.onPressIn();
          }}
          onPressOut={() => {
            if (touchingOrb.current) press.onPressOut();
            touchingOrb.current = false;
          }}
          style={[styles.orbButton, press.animatedStyle]}
        >
          {orbMounted && (
            <Animated.View
              style={[styles.orbCanvas, orbStyle]}
              collapsable={false}
              pointerEvents="none"
              accessible={false}
            >
              <Canvas style={StyleSheet.absoluteFill}>
                {effect && (
                  <Fill>
                    <Shader source={effect} uniforms={uniforms} />
                  </Fill>
                )}
              </Canvas>
            </Animated.View>
          )}
        </AnimatedPressable>
      </View>
      <TaskHero
        title={status}
        description={
          recording
            ? 'Tap to send your question.'
            : buffering
              ? 'Buffering a few seconds of speech…'
              : generating || playing
                ? 'Tap to interrupt.'
                : 'Tap the orb to talk, or type below.'
        }
      />
    </View>
  );
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { layout, spacing } = tokens;
const orbDiameter = layout.voiceOrbSize * OMNI_ORB_MAX_RADIUS;
const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  orbArea: {
    width: layout.voiceOrbSize,
    height: layout.voiceOrbSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbButton: { width: orbDiameter, height: orbDiameter },
  orbCanvas: {
    position: 'absolute',
    width: layout.voiceOrbSize,
    height: layout.voiceOrbSize,
    left: (orbDiameter - layout.voiceOrbSize) / 2,
    top: (orbDiameter - layout.voiceOrbSize) / 2,
  },
});
