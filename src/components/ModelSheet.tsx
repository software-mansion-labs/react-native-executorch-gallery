import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { IconButton } from '@/components/IconButton';
import type { ModelControls } from '@/hooks/useModelControls';
import { formatModelSize } from '@/lib/model-cache';
import { tokens, useTheme } from '@/theme';

export type ModelStatus = {
  isReady: boolean;
  downloadProgress: number;
  resource?: unknown;
  error?: unknown;
};

type ModelSheetProps = {
  visible: boolean;
  onClose: () => void;
  model: ModelControls;
  status: ModelStatus;
  busy: boolean;
};

/** A compact model summary with readiness and deletion of cached weights. */
export function ModelSheet({ visible, onClose, model, status, busy }: ModelSheetProps) {
  const { colors } = useTheme();
  const ready = model.loaded && status.isReady && !model.deleting;
  const loading = model.loaded && !status.isReady && !status.error;
  const state = model.deleting
    ? 'Deleting model…'
    : ready
      ? 'Ready to run'
      : loading
        ? status.resource
          ? 'Preparing model…'
          : `Downloading… ${Math.round(status.downloadProgress)}%`
        : model.storedBytes === undefined
          ? 'Checking model…'
          : model.storedBytes
            ? model.loadLabel === 'Download model'
              ? 'Partially downloaded'
              : 'Downloaded'
            : 'Not downloaded';

  return (
    <BottomSheet title="Model" visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.model}>
            <AppText variant="title">{model.info.name}</AppText>
            <View style={styles.metadata}>
              <View style={styles.status}>
                {ready && (
                  <Animated.View
                    accessible={false}
                    entering={readyEntrance}
                    style={[styles.dot, { backgroundColor: colors.accent }]}
                  />
                )}
                <AppText
                  variant="secondary"
                  tone={ready ? 'accent' : 'muted'}
                  accessibilityLiveRegion="polite"
                  style={styles.statusText}
                >
                  {state}
                </AppText>
              </View>
              {!!model.storedBytes && (
                <AppText variant="secondary" tone="muted">
                  {formatModelSize(model.storedBytes)}
                </AppText>
              )}
            </View>
          </View>
          {model.deleting ? (
            <View style={styles.activity}>
              <ActivityIndicator color={colors.muted} />
            </View>
          ) : (
            <IconButton
              icon="trash-outline"
              accessibilityLabel="Delete downloaded model"
              onPress={() => model.remove(busy || loading)}
              disabled={!model.storedBytes || busy || loading}
              tone="danger"
            />
          )}
        </View>
        {model.error && (
          <AppText variant="secondary" accessibilityRole="alert" style={{ color: colors.danger }}>
            {model.error}
          </AppText>
        )}
      </View>
    </BottomSheet>
  );
}

const { spacing, layout, radius } = tokens;
const readyEntrance = FadeIn.duration(tokens.motion.photoRevealDuration).reduceMotion(
  ReduceMotion.System
);
const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  model: { flex: 1, gap: spacing.xs },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: '100%' },
  statusText: { flexShrink: 1 },
  dot: {
    width: layout.statusDotSize,
    height: layout.statusDotSize,
    borderRadius: radius.pill,
  },
  activity: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
