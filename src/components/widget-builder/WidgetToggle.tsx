import { Pressable, StyleSheet } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import type { useWidgetAppearance } from '@/hooks/widget-builder/useWidgetAppearance';
import { tokens } from '@/theme';

/** A theme-colored switch with a sliding circular thumb and a full-row accessible touch target. */
export function WidgetToggle({
  label,
  value,
  disabled,
  onChange,
  look,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
  look: ReturnType<typeof useWidgetAppearance>;
}) {
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? 0 : tokens.motion.modelSetupTransitionDuration;
  const { colors } = look;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={styles.row}
    >
      <AppText style={[look.text.body, styles.label]}>{label}</AppText>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.track,
          {
            backgroundColor: value ? colors.accent : colors.background,
            borderColor: value ? colors.accent : colors.muted,
            opacity: disabled ? tokens.opacity.disabled : 1,
            transitionProperty: ['backgroundColor', 'borderColor'],
            transitionDuration: duration,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: value ? colors.onAccent : colors.muted,
              transform: [{ translateX: value ? travel : 0 }],
              transitionProperty: ['transform', 'backgroundColor'],
              transitionDuration: duration,
            },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const { spacing, layout, radius, borderWidth } = tokens;
const width = layout.touchTarget + spacing.sm;
const height = spacing.xxl;
const inset = spacing.xs;
const thumb = height - (inset + borderWidth.thin) * 2;
const travel = width - height;
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.touchTarget,
    gap: spacing.lg,
  },
  label: { flex: 1 },
  track: { width, height, borderRadius: radius.pill, borderWidth: borderWidth.thin },
  thumb: {
    position: 'absolute',
    left: inset,
    top: inset,
    width: thumb,
    height: thumb,
    borderRadius: radius.pill,
  },
});
