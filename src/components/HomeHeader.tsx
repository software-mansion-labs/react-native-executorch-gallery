import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { tokens } from '@/theme';

type HomeHeaderProps = {
  settingsVisible: boolean;
  onSettings: () => void;
};

/** A compact identity label and the design's simple horizontal three-dot settings action. */
export function HomeHeader({ settingsVisible, onSettings }: HomeHeaderProps) {
  return (
    <View style={styles.header}>
      <AppText variant="title" style={styles.title}>
        React Native ExecuTorch
      </AppText>
      <IconButton
        icon="ellipsis-horizontal"
        accessibilityLabel="Open settings"
        accessibilityHint="Appearance and app information"
        accessibilityState={{ expanded: settingsVisible }}
        onPress={onSettings}
      />
    </View>
  );
}

const { spacing, layout } = tokens;

const styles = StyleSheet.create({
  header: {
    minHeight: layout.homeHeaderHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
});
