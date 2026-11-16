import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePromptDock } from '@/hooks/usePromptDock';
import { tokens, useTheme } from '@/theme';

/** Lets results scroll beneath a floating composer, with a soft backdrop fade and space to reveal the final result. */
export function PromptStage({
  footer,
  children,
}: {
  footer: ReactNode;
  children: (contentInset: ViewStyle) => ReactNode;
}) {
  const { colors, scheme } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const { onLayout, reduceTransparency, contentInset } = usePromptDock(!!footer);
  return (
    <View style={styles.root}>
      <View style={styles.content}>{children(contentInset)}</View>
      {!!footer && (
        <View style={styles.dock} onLayout={onLayout} pointerEvents="box-none">
          <MaskedView
            pointerEvents="none"
            style={[styles.backdrop, { bottom: -tokens.spacing.lg - bottom }]}
            maskElement={
              <LinearGradient
                colors={tokens.prompt.fadeMaskColors}
                locations={tokens.prompt.fadeMaskLocations}
                style={StyleSheet.absoluteFill}
              />
            }
          >
            {Platform.OS !== 'ios' || reduceTransparency ? (
              <View style={[styles.content, { backgroundColor: colors.background }]} />
            ) : (
              <BlurView
                intensity={tokens.prompt.blurIntensity}
                tint={scheme}
                style={styles.content}
              />
            )}
          </MaskedView>
          {footer}
        </View>
      )}
    </View>
  );
}

const { spacing } = tokens;
const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  dock: { position: 'absolute', bottom: 0, left: 0, right: 0, gap: spacing.sm },
  backdrop: {
    position: 'absolute',
    top: -spacing.xxxl,
    left: -spacing.xl,
    right: -spacing.xl,
  },
});
