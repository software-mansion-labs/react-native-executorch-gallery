import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { useCardPressAnimation } from '@/hooks/useCardPressAnimation';
import { tokens, useTheme } from '@/theme';

/** Circular photo action using the same compression and spring release as home discovery cards. */
export function PhotoActionButton({
  iconName,
  label,
  disabled,
  onPress,
  loading,
  primary,
  size = 'large',
}: {
  iconName: ComponentProps<typeof Ionicons>['name'];
  label: string;
  disabled: boolean;
  onPress: () => void;
  loading?: boolean;
  primary?: boolean;
  size?: 'small' | 'large';
}) {
  const { colors, iconSize } = useTheme();
  const press = useCardPressAnimation();
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: !!loading }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        styles.button,
        size === 'small' ? styles.small : styles.large,
        { backgroundColor: primary ? colors.accent : colors.surface },
        disabled && !loading && styles.disabled,
        press.animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.onAccent : colors.text} />
      ) : (
        <Ionicons
          name={iconName}
          size={size === 'small' ? iconSize.medium : iconSize.large}
          color={primary ? colors.onAccent : colors.text}
        />
      )}
    </AnimatedPressable>
  );
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { layout, radius, opacity } = tokens;
const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  small: { width: layout.touchTarget, height: layout.touchTarget },
  large: { width: layout.photoControlSize, height: layout.photoControlSize },
  disabled: { opacity: opacity.disabled },
});
