import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { useChatDisclosure } from '@/hooks/chat/useChatDisclosure';
import { tokens, useTheme } from '@/theme';
import icons from '@/assets/icons/chat-icons.json';

/** A measured accordion with stable width and smoothly clipped, fading content. */
export function ChatDisclosure({
  label,
  active = false,
  icon,
  children,
  onToggle,
}: {
  label: string;
  active?: boolean;
  icon?: keyof typeof icons;
  children: ReactNode;
  onToggle: () => void;
}) {
  const { colors, iconSize } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const animation = useChatDisclosure(expanded);
  return (
    <Animated.View entering={entrance}>
      <Pressable
        onPress={() => {
          onToggle();
          setExpanded(!expanded);
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded, busy: active }}
        style={styles.toggle}
      >
        {icon && (
          <Image
            source={{
              uri: `data:image/svg+xml;base64,${RNBlobUtil.base64.encode(icons[icon].replace('currentColor', colors.muted))}`,
            }}
            contentFit="contain"
            style={styles.icon}
            accessible={false}
          />
        )}
        <AppText variant="secondary" tone="muted" style={styles.label}>
          {label}
        </AppText>
        <Animated.View style={animation.chevronStyle}>
          <Ionicons name="chevron-down" color={colors.muted} size={iconSize.small} />
        </Animated.View>
      </Pressable>
      <Animated.View
        style={[styles.clip, animation.contentStyle]}
        pointerEvents={expanded ? 'auto' : 'none'}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
      >
        <View onLayout={animation.onLayout} style={styles.content}>
          {children}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const { spacing, layout } = tokens;
const entrance = FadeIn.duration(tokens.motion.chatDisclosureFadeDuration).reduceMotion(
  ReduceMotion.System
);
const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.touchTarget,
  },
  label: { flexShrink: 1 },
  icon: {
    width: tokens.iconSize.small,
    height: tokens.iconSize.small,
    opacity: tokens.opacity.subtle,
  },
  clip: { overflow: 'hidden' },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
});
