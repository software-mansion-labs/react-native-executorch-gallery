import MaskedView from '@react-native-masked-view/masked-view';
import { BlurTargetView, BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePromptDock } from '@/hooks/usePromptDock';
import { tokens, useTheme } from '@/theme';

/** Lets results scroll beneath a floating composer, with a fading frost and space to reveal the final result. */
export function PromptStage({
  footer,
  children,
}: {
  footer: ReactNode;
  children: (contentInset: ViewStyle) => ReactNode;
}) {
  const { colors, scheme } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const {
    target: blurTargetRef,
    onLayout,
    reduceTransparency,
    contentInset,
  } = usePromptDock(!!footer);
  return (
    <View style={styles.root}>
      <BlurTargetView ref={blurTargetRef} style={styles.content}>
        {children(contentInset)}
      </BlurTargetView>
      {!!footer && (
        <View style={styles.dock} onLayout={onLayout} pointerEvents="box-none">
          <MaskedView
            pointerEvents="none"
            style={[styles.backdrop, { bottom: -tokens.spacing.lg - bottom }]}
            androidRenderingMode="software"
            maskElement={
              <LinearGradient
                colors={tokens.prompt.fadeMaskColors}
                locations={tokens.prompt.fadeMaskLocations}
                style={StyleSheet.absoluteFill}
              />
            }
          >
            {reduceTransparency ? (
              <View style={[styles.content, { backgroundColor: colors.background }]} />
            ) : (
              <BlurView
                blurTarget={blurTargetRef}
                blurMethod="dimezisBlurViewSdk31Plus"
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
    top: -spacing.xxl,
    left: -spacing.xl,
    right: -spacing.xl,
  },
});
