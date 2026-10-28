import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import type { useWidgetAppearance } from '@/hooks/useWidgetAppearance';
import { tokens } from '@/theme';

/** An immediately usable five-star rating; tapping the current rating clears it. */
export function WidgetRating({
  label,
  value,
  disabled,
  onChange,
  look,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  look: ReturnType<typeof useWidgetAppearance>;
}) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <Pressable
          key={rating}
          disabled={disabled}
          accessibilityRole="radio"
          accessibilityLabel={`${label}: ${rating} of 5`}
          accessibilityState={{ checked: value === rating, disabled }}
          onPress={() => onChange(value === rating ? 0 : rating)}
          style={({ pressed }) => [styles.star, pressed && styles.pressed]}
        >
          <Ionicons
            name={value >= rating ? 'star' : 'star-outline'}
            size={tokens.iconSize.large}
            color={value >= rating ? look.colors.accent : look.colors.muted}
          />
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  star: {
    width: tokens.layout.touchTarget,
    height: tokens.layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: tokens.opacity.pressed },
});
