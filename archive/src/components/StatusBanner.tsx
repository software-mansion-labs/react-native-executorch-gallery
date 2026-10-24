import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { borderWidth, radius, spacing, useTheme } from '@/theme';

/** Loading, download progress, and error state contract shared by task hooks. */
export interface TaskStatus {
  /** Whether the neural model and its C++ runtime instance are initialized and ready. */
  isReady: boolean;
  /** Download progress percentage from 0.0 to 1.0 when fetching remote weights. */
  downloadProgress?: number;
  /** Resolved local resource paths returned by ExecuTorch task hooks. */
  resource?: unknown;
  /** Error instance or message if model loading or runtime compilation failed. */
  error?: unknown;
  /** Optional handler to trigger loading the model into memory. */
  onLoad?: () => void;
}

export interface StatusBannerProps {
  /** Task hook status (isReady, downloadProgress, error, resource). */
  status: TaskStatus;
  /** Optional latency metric string (e.g. "Inference 42 ms"). */
  meta?: string;
  /** Optional handler to trigger loading the model into memory. */
  onLoadModel?: () => void;
}

/**
 * Renders the state of an on-device neural model.
 *
 * Displays discrete states with uniform 38px card height:
 * - Error card with descriptive message on compilation/load failure.
 * - Ready state with success dot indicator and optional inference latency badge.
 * - Model not loaded state when the model is gated on explicit user action.
 * - Active download state with progress percentage and integrated bottom progress bar.
 * - Runtime initialization state while ExecuTorch compiles the model into memory.
 *
 * @param props Model status, metadata, and optional load handler.
 * @returns Formatted status card.
 */
export function StatusBanner({ status, meta, onLoadModel }: StatusBannerProps) {
  const { colors } = useTheme();
  const err = status.error ? String((status.error as Error)?.message ?? status.error) : null;
  const rawProgress = status.downloadProgress;
  const pct =
    rawProgress == null
      ? null
      : rawProgress <= 1 && rawProgress > 0
        ? Math.round(rawProgress * 100)
        : Math.round(rawProgress);

  if (err) {
    return (
      <View
        style={[
          styles.errorCard,
          { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
        ]}
      >
        <View style={styles.errorHeader}>
          <View style={[styles.dot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.errorTitle, { color: colors.danger }]}>Error</Text>
        </View>
        <Text style={[styles.errorText, { color: colors.danger }]}>{err}</Text>
      </View>
    );
  }

  if (status.isReady) {
    return (
      <View
        style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.statusLeft}>
          <View style={[styles.dot, { backgroundColor: colors.success }]} />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>Ready</Text>
        </View>

        {meta ? (
          <View style={styles.latencyRow}>
            <Icon name="bolt" size={12} color={colors.accent} strokeWidth={2.4} />
            <Text style={[styles.latencyText, { color: colors.text }]}>{meta}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  if (onLoadModel) {
    return (
      <View
        style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.statusLeft}>
          <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
          <Text numberOfLines={1} style={[styles.statusText, { color: colors.textSecondary }]}>
            Model not loaded
          </Text>
        </View>
      </View>
    );
  }

  if (!status.resource) {
    return (
      <View
        style={[
          styles.statusCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            overflow: 'hidden',
          },
        ]}
      >
        <View style={styles.statusLeft}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.statusText, { color: colors.text }]}>Downloading model assets…</Text>
        </View>
        <Text style={[styles.progressPct, { color: colors.accent }]}>{pct ?? 0}%</Text>
        <View style={[styles.cardBottomProgressTrack, { backgroundColor: colors.surfaceSubtle }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.max(2, Math.min(100, pct ?? 0))}%`,
                backgroundColor: colors.accent,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.statusLeft}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text numberOfLines={1} style={[styles.statusText, { color: colors.textSecondary }]}>
          Initializing ExecuTorch runtime…
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth,
    gap: spacing.xs,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.md,
    borderWidth,
    minHeight: 38,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cardBottomProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 13, fontWeight: '500' },
  latencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  latencyText: {
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
