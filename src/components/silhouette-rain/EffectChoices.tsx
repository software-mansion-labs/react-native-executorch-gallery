import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { EFFECTS } from '@/lib/silhouette-rain/effects';
import type { EffectId } from '@/lib/silhouette-rain/physics';
import { SEGMENTERS, type SegmenterId } from '@/lib/silhouette-rain/segmenter';
import { tokens, useTheme, type Theme } from '@/theme';

/** Uses the Gallery appearance selector's equal-width segmented-control pattern. */
export function EffectChoices({
  value,
  onChange,
  appearance,
}: {
  value: EffectId;
  onChange: (id: EffectId) => void;
  appearance?: Theme['scheme'];
}) {
  const { colors, iconSize } = useTheme(appearance);
  return (
    <View
      style={[styles.control, { backgroundColor: colors.surface }]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Effect"
    >
      {EFFECTS.map((option) => (
        <Pressable
          key={option.id}
          accessibilityRole="radio"
          accessibilityLabel={`${option.label} effect`}
          accessibilityState={{ checked: value === option.id }}
          onPress={() => onChange(option.id)}
          style={({ pressed }) => [
            styles.option,
            value === option.id && { backgroundColor: colors.accent },
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={option.icon}
            size={iconSize.small}
            color={value === option.id ? colors.onAccent : colors.muted}
          />
          <AppText
            variant="caption"
            style={{ color: value === option.id ? colors.onAccent : colors.text }}
          >
            {option.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

/** Pausing before a model switch allows its native session to finish and be released. */
export function SegmenterChoices({
  value,
  onChange,
  disabled,
  appearance,
}: {
  value: SegmenterId;
  onChange: (id: SegmenterId) => void;
  disabled: boolean;
  appearance?: Theme['scheme'];
}) {
  const { colors } = useTheme(appearance);
  return (
    <View
      style={[styles.control, { backgroundColor: colors.surface }]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Segmenter"
    >
      {(Object.keys(SEGMENTERS) as SegmenterId[]).map((id) => (
        <Pressable
          key={id}
          disabled={disabled}
          accessibilityRole="radio"
          accessibilityLabel={`${SEGMENTERS[id].name} segmenter`}
          accessibilityHint={disabled ? 'Pause playback to change the segmenter' : undefined}
          accessibilityState={{ checked: value === id, disabled }}
          onPress={() => onChange(id)}
          style={({ pressed }) => [
            styles.option,
            value === id && { backgroundColor: colors.background },
            pressed && styles.pressed,
          ]}
        >
          <AppText variant="caption" appearance={appearance} tone={value === id ? 'text' : 'muted'}>
            {SEGMENTERS[id].name}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
const { spacing, radius, layout, opacity } = tokens;
const styles = StyleSheet.create({
  control: { flexDirection: 'row', padding: spacing.xs, borderRadius: radius.pill, width: '100%' },
  option: {
    flex: 1,
    minHeight: layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
  },
  pressed: { opacity: opacity.pressed },
});
