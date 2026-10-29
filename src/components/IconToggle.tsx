import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { tokens, useTheme } from '@/theme';

/** A single press surface with two circular icon states and a sliding selection. */
export function IconToggle({
  value,
  onChange,
  label,
  disabled = false,
  renderIcon,
}: {
  value: boolean;
  label: string;
  disabled?: boolean;
  renderIcon: (selected: boolean, color: string) => ReactNode;
  onChange: (value: boolean) => void;
}) {
  const { colors } = useTheme();
  const position = useSharedValue(value ? segmentWidth : 0);
  useEffect(() => {
    position.set(
      withTiming(value ? segmentWidth : 0, {
        duration: tokens.motion.modelSetupTransitionDuration,
        reduceMotion: ReduceMotion.System,
      })
    );
  }, [value, position]);
  const selection = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() }] }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={styles.target}
    >
      <View style={[styles.control, { borderColor: colors.border }]} pointerEvents="none">
        <Animated.View
          pointerEvents="none"
          style={[styles.selection, { backgroundColor: colors.surface }, selection]}
        />
        {([false, true] as const).map((option) => (
          <View key={String(option)} style={styles.option}>
            {renderIcon(option, value === option ? colors.text : colors.muted)}
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const { spacing, radius, borderWidth, layout } = tokens;
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
});
