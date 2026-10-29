import React, { ReactNode, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import { RunButton } from '@/components/RunButton';
import type { TaskStatus } from '@/components/StatusBanner';
import { TaskHeader } from '@/components/TaskHeader';
import { spacing, useTheme } from '@/theme';

export type { TaskStatus };

export interface TaskScreenProps {
  /** Screen and navigation header title. */
  title: string;
  /** Model architecture and dataset metadata subtitle (e.g. "SSDLite MobileNetV3 · COCO"). */
  subtitle?: string;
  /** Task hook status (isReady, downloadProgress, error, resource). */
  status: TaskStatus;
  /** Whether the user can currently run the model task. */
  canRun: boolean;
  /** Whether the model is actively processing on-device inference. */
  busy?: boolean;
  /** Action handler invoked when the user taps the primary task button. */
  onRun: () => void;
  /** Label for the primary action button. */
  runLabel?: string;
  /** Optional metadata chip text (e.g. latency metric). */
  meta?: string;
  /** Optional handler to trigger loading the model into memory. */
  onLoadModel?: () => void;
  /** Optional handler to delete/clear downloaded model weights from storage. */
  onDeleteModel?: () => Promise<void> | void;
  /** Replace the default footer CTA with custom content (e.g. a prompt input). */
  footer?: ReactNode;
  /** Task UI viewport content. */
  children: ReactNode;
}

/**
 * Universal layout wrapper for on-device ExecuTorch ML tasks.
 *
 * Enforces unified typography, model ready indicators, download progress,
 * and responsive action controls.
 *
 * @param props Task screen configuration and children viewports.
 * @returns Fully styled task view with header and bottom action bar.
 */
export function TaskScreen({
  title,
  subtitle,
  status,
  canRun,
  busy = false,
  onRun,
  runLabel = 'Run task',
  meta,
  onLoadModel,
  onDeleteModel,
  footer,
  children,
}: TaskScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const isExecutingRef = useRef(false);

  const handleRunPress = () => {
    if (!canRun || busy || isExecutingRef.current) return;
    isExecutingRef.current = true;
    try {
      onRun();
    } finally {
      setTimeout(() => {
        isExecutingRef.current = false;
      }, 300);
    }
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.bg,
          paddingTop: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xs,
          gap: spacing.sm + 2,
        },
      ]}
    >
      <Stack.Screen
        options={{
          title,
          headerBackTitle: 'Gallery',
          headerTintColor: colors.text,
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      />

      <TaskHeader
        subtitle={subtitle}
        status={status}
        meta={meta}
        onLoadModel={onLoadModel}
        onDeleteModel={onDeleteModel}
      />

      <View style={styles.contentBody}>{children}</View>

      <View style={styles.footer}>
        {footer || (
          <RunButton canRun={canRun} busy={busy} onPress={handleRunPress} label={runLabel} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  contentBody: {
    flex: 1,
    minHeight: 0,
  },
  footer: {
    paddingTop: 2,
  },
});
