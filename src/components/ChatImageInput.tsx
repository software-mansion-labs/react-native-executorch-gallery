import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PhotoActionButton } from '@/components/PhotoActionButton';
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
      <PhotoActionButton
        size="small"
        iconName="images-outline"
        label="Choose photo"
        disabled={disabled || picking}
        onPress={() => void onChoose('library')}
      />
      <PhotoActionButton
        size="small"
        iconName="camera-outline"
        label="Take photo"
        disabled={disabled || picking}
        onPress={() => void onChoose('camera')}
      />
      {picking && <ActivityIndicator color={colors.muted} />}
    </View>
  );
}
const { spacing } = tokens;
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
