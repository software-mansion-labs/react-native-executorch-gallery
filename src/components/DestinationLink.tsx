import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { useCardPressAnimation } from '@/hooks/useCardPressAnimation';
import { tokens, useTheme } from '@/theme';

type DestinationLinkProps = {
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  query: string;
};

/** A home discovery card. Opens the task list with its query prefilled.
 * The title, subtitle, and named icon describe the destination. */
export function DestinationLink({ title, subtitle, icon, query }: DestinationLinkProps) {
  const { colors, iconSize } = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = useCardPressAnimation();

  return (
    <Animated.View style={animatedStyle}>
      <Link href={{ pathname: '/tasks', params: { query } }} asChild>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityRole="link"
          accessibilityLabel={`${title}. ${subtitle}`}
          style={{ ...styles.card, backgroundColor: colors.surface }}
        >
          <Ionicons name={icon} size={iconSize.large} color={colors.muted} />
          <View style={styles.copy}>
            <AppText variant="title">{title}</AppText>
            <AppText variant="secondary" tone="muted">
              {subtitle}
            </AppText>
          </View>
        </Pressable>
      </Link>
    </Animated.View>
  );
}

const { spacing, radius } = tokens;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.card,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
});
