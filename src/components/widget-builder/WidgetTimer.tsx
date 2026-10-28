import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { useWidgetTimer } from '@/hooks/widget-builder/useWidgetTimer';
import type { useWidgetAppearance } from '@/hooks/widget-builder/useWidgetAppearance';
import { tokens } from '@/theme';

/** Local start/pause/reset countdown; remounting on a widget reset restores its configured duration. */
export function WidgetTimer({
  seconds,
  disabled,
  look,
}: {
  seconds: number;
  disabled: boolean;
  look: ReturnType<typeof useWidgetAppearance>;
}) {
  const timer = useWidgetTimer(seconds);
  return (
    <View style={styles.row}>
      <AppText style={[look.text.number, styles.time]}>{timer.display}</AppText>
      <IconButton
        icon={timer.running ? 'pause' : 'play'}
        accessibilityLabel={timer.running ? 'Pause timer' : 'Start timer'}
        disabled={disabled}
        onPress={timer.toggle}
        color={look.colors.accent}
      />
      <IconButton
        icon="refresh-outline"
        accessibilityLabel="Reset timer"
        disabled={disabled}
        onPress={timer.reset}
        color={look.colors.muted}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  time: { flex: 1, minWidth: tokens.layout.touchTarget, fontVariant: ['tabular-nums'] },
});
