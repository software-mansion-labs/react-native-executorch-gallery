import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { tokens } from '@/theme';

type PageHeaderProps = {
  title: string;
  onBack: () => void;
  subtitle?: string;
  action?: ReactNode;
  backLabel?: string;
};

/** Centers a page title between a back action and an equal-width spacer. */
export function PageHeader({
  title,
  onBack,
  subtitle,
  action,
  backLabel = 'Back to gallery',
}: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <IconButton icon="chevron-back" accessibilityLabel={backLabel} onPress={onBack} />
      <View style={styles.title}>
        <AppText variant="title" accessibilityRole="header" style={styles.text}>
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="caption" tone="muted" style={styles.text}>
            {subtitle}
          </AppText>
        )}
      </View>
      {action ?? <View style={styles.spacer} />}
    </View>
  );
}

const { spacing, layout } = tokens;

const styles = StyleSheet.create({
  header: {
    minHeight: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  title: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  text: {
    textAlign: 'center',
  },
  spacer: {
    width: layout.touchTarget,
  },
});
