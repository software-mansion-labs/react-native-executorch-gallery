import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { tokens } from '@/theme';

type HomeHeaderProps = {
  settingsVisible: boolean;
  onSettings: () => void;
};

/** Keeps settings at the top right without shifting the home hero. */
export function HomeHeader({ settingsVisible, onSettings }: HomeHeaderProps) {
  return (
    <View style={styles.header}>
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
    justifyContent: 'flex-end',
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
  },
});
