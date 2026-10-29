import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import type { TaskStatus } from '@/components/StatusBanner';
import { StatusBanner } from '@/components/StatusBanner';
import { borderWidth, modelTag, radius, spacing, useTheme } from '@/theme';

export interface TaskHeaderProps {
  /** Model architecture and dataset metadata subtitle (e.g. "SSDLite MobileNetV3 · COCO"). */
  subtitle?: string;
  /** Task hook status (isReady, downloadProgress, error, resource). */
  status: TaskStatus;
  /** Optional latency metric string (e.g. "Inference 42 ms"). */
  meta?: string;
  /** Optional handler to trigger loading the model into memory. */
  onLoadModel?: () => void;
  /** Optional handler to delete/clear downloaded model weights from storage. */
  onDeleteModel?: () => Promise<void> | void;
}

/**
 * Top metadata bar and model lifecycle controller for task screens.
 *
 * Renders the model architecture tag, the matched Load/Delete action capsule
 * in the top right, and the underlying {@link StatusBanner}.
 *
 * @param props Subtitle, model status, latency metadata, and load/delete callbacks.
 * @returns Header block for TaskScreen.
 */
export function TaskHeader({
  subtitle,
  status,
  meta,
  onLoadModel,
  onDeleteModel,
}: TaskHeaderProps) {
  const { colors, scheme } = useTheme();
  const tag = modelTag[scheme];

  return (
    <View style={styles.headerBlock}>
      <View style={styles.headerRow}>
        {subtitle ? (
          <View style={[styles.badge, { backgroundColor: tag.bg, borderColor: tag.border }]}>
            <Text style={[styles.badgeText, { color: tag.fg }]}>{subtitle}</Text>
          </View>
        ) : null}

        {status.isReady && onDeleteModel ? (
          <Pressable
            onPress={() => {
              Alert.alert(
                'Delete Model Weights',
                'Delete downloaded model weights from device storage to free up disk space?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: onDeleteModel,
                  },
                ]
              );
            }}
            style={({ pressed }) => [
              styles.actionBadge,
              {
                backgroundColor: colors.dangerSoft,
                borderColor: colors.danger,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Icon name="trash" size={12} color={colors.danger} strokeWidth={2} />
            <Text style={[styles.badgeText, { color: colors.danger }]}>Delete model</Text>
          </Pressable>
        ) : onLoadModel && !status.isReady ? (
          <Pressable
            onPress={onLoadModel}
            style={({ pressed }) => [
              styles.actionBadge,
              {
                backgroundColor: tag.bg,
                borderColor: tag.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Icon name="download" size={12} color={tag.fg} strokeWidth={2} />
            <Text style={[styles.badgeText, { color: tag.fg }]}>Load model</Text>
          </Pressable>
        ) : null}
      </View>

      <StatusBanner status={status} meta={meta} onLoadModel={onLoadModel} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: spacing.sm + 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth,
  },
  actionBadge: {
    height: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.1,
  },
});
