import type { PropsWithChildren } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';

import { useBottomSheetAnimation } from '@/hooks/useBottomSheetAnimation';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { tokens, useTheme } from '@/theme';

type BottomSheetProps = PropsWithChildren<{
  title: string;
  visible: boolean;
  onClose: () => void;
}>;

/** A compact, scrollable modal sheet. Dismisses through the close action, backdrop, or Android Back. */
export function BottomSheet({ title, visible, onClose, children }: BottomSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { sheetStyle, backdropStyle, onLayout, onShow, dismiss } = useBottomSheetAnimation(onClose);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={dismiss}
      onShow={onShow}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.backdrop, { backgroundColor: colors.scrim }, backdropStyle]}
          pointerEvents="none"
        />
        <Pressable style={styles.backdrop} onPress={dismiss} accessible={false} />
        <Animated.View
          onLayout={onLayout}
          style={[
            styles.sheet,
            sheetStyle,
            { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
          accessibilityViewIsModal
          onAccessibilityEscape={dismiss}
        >
          <View style={styles.header}>
            <AppText variant="heading" accessibilityRole="header" style={styles.title}>
              {title}
            </AppText>
            <IconButton
              icon="close"
              size="small"
              tone="muted"
              accessibilityLabel={`Close ${title.toLowerCase()}`}
              onPress={dismiss}
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const { spacing, radius, layout } = tokens;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    maxHeight: layout.sheetMaxHeight,
    alignSelf: 'center',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.xl,
    paddingRight: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
});
