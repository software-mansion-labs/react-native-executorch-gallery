import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BlueActionSurface } from '@/components/BlueActionSurface';
import { CircularProgress } from '@/components/CircularProgress';
import { useCircularButtonPressAnimation } from '@/hooks/useCircularButtonPressAnimation';
import { tokens, useTheme, type Theme } from '@/theme';

/** Circular photo action with a firm, softly dimmed press response. */
export function PhotoActionButton({
  iconName,
  label,
  disabled,
  onPress,
  loading,
  primary,
  size = 'large',
  appearance,
}: {
  iconName: ComponentProps<typeof Ionicons>['name'];
  label: string;
  disabled: boolean;
  onPress: () => void;
  loading?: boolean;
  primary?: boolean;
  size?: 'small' | 'large';
  appearance?: Theme['scheme'];
}) {
  const { colors, iconSize, scheme } = useTheme(appearance);
  const disabledPrimary = primary && disabled && !loading;
  const foreground = disabledPrimary
    ? colors.muted
    : primary
      ? tokens.actionSurface[scheme].foreground
      : colors.text;
  const small = size === 'small';
  const glyphSize = small ? iconSize.small : iconSize.large;
  const press = useCircularButtonPressAnimation(disabled && !loading);
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
        small ? styles.small : styles.large,
        !disabledPrimary && press.animatedStyle,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.button,
          small ? styles.smallFace : styles.large,
          disabledPrimary && { backgroundColor: colors.promptDisabledAction },
          !primary && { backgroundColor: colors.surface },
        ]}
      >
        {primary && !disabledPrimary && <BlueActionSurface scheme={scheme} />}
        {loading ? (
          <CircularProgress
            progress={100}
            indeterminate
            size={glyphSize}
            color={foreground}
            accessible={false}
          />
        ) : (
          <Ionicons name={iconName} size={glyphSize} color={foreground} />
        )}
      </View>
    </AnimatedPressable>
  );
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { layout, radius } = tokens;
const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  small: { width: layout.touchTarget, height: layout.touchTarget },
  smallFace: { width: layout.compactPromptActionSize, height: layout.compactPromptActionSize },
  large: { width: layout.photoControlSize, height: layout.photoControlSize },
});
