import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { tokens, useTheme } from '@/theme';

/** A composer-sized icon toggle for filtered and original text, with a sliding selection. */
export function PrivacyFilterToggle({
  original,
  onChange,
}: {
  original: boolean;
  onChange: (original: boolean) => void;
}) {
  const { colors, iconSize } = useTheme();
  const position = useSharedValue(original ? segmentWidth : 0);
  useEffect(() => {
    position.set(
      withTiming(original ? segmentWidth : 0, {
        duration: tokens.motion.modelSetupTransitionDuration,
        reduceMotion: ReduceMotion.System,
      })
    );
  }, [original, position]);
  const selection = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Show original text"
      accessibilityState={{ checked: original }}
      onPress={() => onChange(!original)}
      style={({ pressed }) => [styles.target, pressed && styles.pressed]}
    >
      <View style={[styles.control, { borderColor: colors.border }]} pointerEvents="none">
        <Animated.View
          pointerEvents="none"
          style={[styles.selection, { backgroundColor: colors.surface }, selection]}
        />
        {([false, true] as const).map((value) => (
          <View key={String(value)} style={styles.option}>
            <Ionicons
              name={value ? 'eye-outline' : 'eye-off-outline'}
              size={iconSize.small}
              color={original === value ? colors.text : colors.muted}
              accessible={false}
            />
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const { spacing, radius, borderWidth, layout, opacity } = tokens;
const controlHeight = layout.promptSuggestionHeight;
const controlWidth = controlHeight * 2 - spacing.sm;
const selectionSize = controlHeight - (spacing.xs + borderWidth.thin) * 2;
const segmentWidth = (controlWidth - (spacing.xs + borderWidth.thin) * 2) / 2;
const styles = StyleSheet.create({
  target: { minHeight: layout.touchTarget, justifyContent: 'center' },
  control: {
    flexDirection: 'row',
    width: controlWidth,
    height: controlHeight,
    padding: spacing.xs,
    borderWidth: borderWidth.thin,
    borderRadius: radius.pill,
  },
  selection: {
    position: 'absolute',
    left: spacing.xs + (segmentWidth - selectionSize) / 2,
    top: spacing.xs,
    width: selectionSize,
    height: selectionSize,
    borderRadius: radius.pill,
  },
  option: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: opacity.pressed },
});
