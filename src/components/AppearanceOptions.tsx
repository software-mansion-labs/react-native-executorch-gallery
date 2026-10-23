import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useAppearance, type AppearancePreference } from '@/hooks/useAppearance';
import { tokens, useTheme } from '@/theme';

const OPTIONS: {
  value: AppearancePreference;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}[] = [
  { value: 'system', label: 'System', icon: 'contrast-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

/** A compact three-state appearance control with labeled system, sun, and moon icons. */
export function AppearanceOptions() {
  const { preference, setPreference } = useAppearance();
  const { colors, iconSize } = useTheme();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Appearance">
      <AppText variant="settingsSection" tone="muted" style={styles.heading}>
        Appearance
      </AppText>
      <View style={[styles.control, { backgroundColor: colors.border }]}>
        {OPTIONS.map((option) => {
          const selected = preference === option.value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label} theme`}
              accessibilityState={{ checked: selected }}
              onPress={() => setPreference(option.value)}
              style={({ pressed }) => [
                styles.option,
                selected && { backgroundColor: colors.background },
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name={option.icon}
                size={iconSize.small}
                color={selected ? colors.text : colors.muted}
                accessible={false}
              />
              <AppText variant="settingsBody" tone={selected ? 'text' : 'muted'}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const { spacing, layout, opacity, radius } = tokens;

const styles = StyleSheet.create({
  heading: {
    paddingBottom: spacing.md,
  },
  control: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.pill,
  },
  option: {
    flex: 1,
    minHeight: layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  pressed: {
    opacity: opacity.pressed,
  },
});
