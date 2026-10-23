import { router } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/ActionButton';
import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { IconButton } from '@/components/IconButton';
import { PageHeader } from '@/components/PageHeader';
import { tokens, useTheme } from '@/theme';

type TaskScreenProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  status: { isReady: boolean; downloadProgress: number; resource?: unknown; error?: unknown };
  loaded: boolean;
  deleting?: boolean;
  error?: string | null;
  busy: boolean;
  onLoadModel: () => void;
  onUnloadModel: () => void;
  onDeleteModel: () => void;
  modelMenuVisible: boolean;
  onOpenModelMenu: () => void;
  onCloseModelMenu: () => void;
}>;

/** Shared task layout with a centered header and model controls in an overflow sheet. */
export function TaskScreen({
  title,
  subtitle,
  status,
  loaded,
  deleting,
  error,
  busy,
  onLoadModel,
  onUnloadModel,
  onDeleteModel,
  modelMenuVisible,
  onOpenModelMenu,
  onCloseModelMenu,
  children,
}: TaskScreenProps) {
  const { colors } = useTheme();
  const modelError =
    status.error instanceof Error
      ? status.error.message
      : status.error
        ? String(status.error)
        : null;
  const message = error || modelError;
  const loading = loaded && !status.isReady && !modelError;
  const modelState = !loaded
    ? 'Not loaded'
    : modelError
      ? 'Could not load model'
      : status.isReady
        ? 'Ready on this device'
        : status.resource
          ? 'Preparing model…'
          : `Downloading · ${Math.round(status.downloadProgress)}%`;

  return (
    <View style={styles.root}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        backLabel="Back to all demos"
        onBack={() => router.dismissTo('/tasks')}
        action={
          <IconButton
            icon="ellipsis-horizontal"
            accessibilityLabel="Manage model"
            onPress={onOpenModelMenu}
            disabled={busy || deleting}
          />
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.viewport}>{children}</View>
        {message && (
          <AppText variant="secondary" accessibilityRole="alert" style={{ color: colors.danger }}>
            {message}
          </AppText>
        )}
      </ScrollView>
      <BottomSheet title="Model" visible={modelMenuVisible} onClose={onCloseModelMenu}>
        <View style={styles.modelSheet}>
          <AppText variant="title">{subtitle}</AppText>
          <AppText variant="secondary" tone="muted" accessibilityLiveRegion="polite">
            {modelState}
          </AppText>
          {message && (
            <AppText variant="secondary" style={{ color: colors.danger }}>
              {message}
            </AppText>
          )}
          <ActionButton
            label={loaded ? (loading ? 'Cancel loading' : 'Unload model') : 'Load model'}
            onPress={loaded ? onUnloadModel : onLoadModel}
            disabled={busy || deleting}
            secondary
          />
          {status.isReady && (
            <ActionButton
              label="Delete downloaded model"
              onPress={onDeleteModel}
              disabled={busy}
              busy={deleting}
              secondary
            />
          )}
        </View>
      </BottomSheet>
    </View>
  );
}

const { spacing, layout } = tokens;
const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  viewport: { flex: 1, minHeight: layout.photoMinHeight },
  modelSheet: { gap: spacing.lg, paddingBottom: spacing.xl },
});
