import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import type { useWidgetAppearance } from '@/hooks/widget-builder/useWidgetAppearance';
import Animated from 'react-native-reanimated';
import { widgetReveal, widgetExpansion } from '@/lib/widget-builder/widget-motion';
import { tokens } from '@/theme';

/** Fixed options with explicit single-selection or independent multiple-selection behavior. */
export function WidgetChoices({
  label,
  options,
  value,
  multiple,
  disabled,
  onChange,
  look,
}: {
  label: string;
  options: string[];
  value: string | string[];
  multiple: boolean;
  disabled: boolean;
  onChange: (value: string | string[]) => void;
  look: ReturnType<typeof useWidgetAppearance>;
}) {
  const { colors, appearance } = look;
  return (
    <View style={styles.options}>
      {options.map((option, index) => {
        const checked = Array.isArray(value) ? value.includes(option) : value === option;
        return (
          <Animated.View key={option} entering={widgetReveal(index)} layout={widgetExpansion}>
            <Pressable
              disabled={disabled}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityLabel={`${label}: ${option}`}
              accessibilityState={{ checked, disabled }}
              onPress={() =>
                onChange(
                  multiple
                    ? checked
                      ? (value as string[]).filter((item) => item !== option)
                      : [...(value as string[]), option]
                    : option
                )
              }
              style={({ pressed }) => [
                styles.option,
                {
                  borderRadius: look.controlRadius,
                  backgroundColor: checked ? colors.accent : colors.background,
                  borderColor: colors.border,
                },
                pressed && styles.pressed,
              ]}
            >
              {multiple && (
                <Ionicons
                  name={checked ? 'checkbox-outline' : 'square-outline'}
                  size={tokens.iconSize.small}
                  color={checked ? colors.onAccent : colors.text}
                />
              )}
              <AppText
                appearance={appearance}
                variant="secondary"
                style={[look.text.secondary, { color: checked ? colors.onAccent : colors.text }]}
              >
                {option}
              </AppText>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}
const { spacing, radius, layout, borderWidth, opacity } = tokens;
const styles = StyleSheet.create({
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    minHeight: layout.promptSuggestionHeight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: borderWidth.thin,
  },
  pressed: { opacity: opacity.pressed },
});
