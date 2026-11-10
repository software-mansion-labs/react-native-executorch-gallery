import { useRef } from 'react';
import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { Keyboard, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Animated from 'react-native-reanimated';

import { TaskHero } from '@/components/TaskHero';
import { useCircularButtonPressAnimation } from '@/hooks/useCircularButtonPressAnimation';
import { useFadingVisibility } from '@/hooks/useFadingVisibility';
import { useOmniOrbAnimation } from '@/hooks/omni/useOmniOrbAnimation';
import { tokens } from '@/theme';

import { OMNI_ORB_MAX_RADIUS, OMNI_ORB_SHADER } from '@/lib/omni/orbShader';

const effect = Skia.RuntimeEffect.Make(OMNI_ORB_SHADER);

/** Regularly drifting harmonic orb with voice controls and a fading modal transition. */
export function OmniVoiceStage({
  recording,
  starting,
  generating,
  playing,
  buffering,
  paused = false,
  onPress,
}: {
  recording: boolean;
  starting: boolean;
  generating: boolean;
  playing: boolean;
  buffering: boolean;
  paused?: boolean;
  onPress: () => void;
}) {
  const { mounted: orbMounted, style: orbStyle } = useFadingVisibility(!paused);
  const press = useCircularButtonPressAnimation(starting);
  const { uniforms, contains } = useOmniOrbAnimation({
    recording,
    generating,
    playing,
    mounted: orbMounted,
  });
  const touchingOrb = useRef(false);
  const insideOrb = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const x = (locationX - orbDiameter / 2) / (tokens.layout.voiceOrbSize / 2);
    const y = (locationY - orbDiameter / 2) / (tokens.layout.voiceOrbSize / 2);
    return contains(x, y);
  };
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
            else Keyboard.dismiss();
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
            : generating || playing || buffering
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
