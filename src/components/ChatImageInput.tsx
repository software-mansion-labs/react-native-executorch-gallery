import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { tokens, useTheme } from '@/theme';

/** Photo actions sit beside the context indicator and stay locked during generation or picking. */
export function ChatImageInput({
  onChoose,
  disabled,
  picking,
}: {
  onChoose: (source: 'library' | 'camera') => Promise<void>;
  disabled: boolean;
  picking: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.action, { backgroundColor: colors.surface }]}>
        <IconButton
          icon="images-outline"
          accessibilityLabel="Choose photo"
          disabled={disabled || picking}
          onPress={() => void onChoose('library')}
        />
      </View>
      <View style={[styles.action, { backgroundColor: colors.surface }]}>
        <IconButton
          icon="camera-outline"
          accessibilityLabel="Take photo"
          disabled={disabled || picking}
          onPress={() => void onChoose('camera')}
        />
      </View>
      {picking && <ActivityIndicator color={colors.muted} />}
    </View>
  );
}
const { spacing, radius } = tokens;
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  action: { borderRadius: radius.pill },
});
