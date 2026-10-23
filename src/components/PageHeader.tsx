import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { tokens } from '@/theme';

type PageHeaderProps = {
  title: string;
  onBack: () => void;
};

/** Centers a page title between a back action and an equal-width spacer. */
export function PageHeader({ title, onBack }: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <IconButton icon="chevron-back" accessibilityLabel="Back to gallery" onPress={onBack} />
      <AppText variant="title" accessibilityRole="header" style={styles.title}>
        {title}
      </AppText>
      <View style={styles.spacer} />
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
    textAlign: 'center',
  },
  spacer: {
    width: layout.touchTarget,
  },
});
