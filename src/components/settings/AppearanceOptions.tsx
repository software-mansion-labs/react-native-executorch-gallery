import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import type { AppearancePreference } from '@/context/AppearanceContext';
import { useAppearance } from '@/hooks/useAppearance';
import { tokens, useTheme } from '@/theme';

const OPTIONS: { value: AppearancePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Three mutually exclusive appearance choices, applied app-wide for the current session. */
export function AppearanceOptions() {
  const { preference, setPreference } = useAppearance();
  const { colors, iconSize } = useTheme();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Appearance">
      <AppText variant="settingsSection" tone="muted" style={styles.heading}>
        Appearance
      </AppText>
      {OPTIONS.map((option) => {
        const selected = preference === option.value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => setPreference(option.value)}
            style={({ pressed }) => [styles.option, pressed && styles.pressed]}
          >
            <AppText variant="settingsBody" style={styles.label}>
              {option.label}
            </AppText>
            {selected && <Ionicons name="checkmark" size={iconSize.small} color={colors.accent} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const { spacing, layout, opacity } = tokens;

const styles = StyleSheet.create({
  heading: {
    paddingBottom: spacing.xs,
  },
  option: {
    minHeight: layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  label: {
    flex: 1,
  },
  pressed: {
    opacity: opacity.pressed,
  },
});
