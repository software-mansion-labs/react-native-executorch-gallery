import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { tokens, type Theme } from '@/theme';

type PageHeaderProps = {
  title: string;
  onBack: () => void;
  subtitle?: string;
  action?: ReactNode;
  backLabel?: string;
  appearance?: Theme['scheme'];
};

/** Centers a page title between a back action and an equal-width spacer. */
export function PageHeader({
  title,
  onBack,
  subtitle,
  action,
  backLabel = 'Back to gallery',
  appearance,
}: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <IconButton
        icon="chevron-back"
        accessibilityLabel={backLabel}
        onPress={onBack}
        appearance={appearance}
      />
      <View style={styles.title}>
        <AppText
          variant="pageTitle"
          accessibilityRole="header"
          style={styles.text}
          appearance={appearance}
        >
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="caption" tone="muted" style={styles.text} appearance={appearance}>
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
