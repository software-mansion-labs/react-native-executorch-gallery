import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { ModelSheet, type ModelStatus } from '@/components/ModelSheet';
import { PageHeader } from '@/components/PageHeader';
import type { ModelControls } from '@/hooks/useModelControls';
import { tokens, useTheme } from '@/theme';

type TaskScreenProps = PropsWithChildren<{
  title: string;
  status: ModelStatus;
  model: ModelControls;
  error?: string | null;
  busy: boolean;
  scrollable?: boolean;
  /** Draws a camera or other full-screen backdrop beneath the header and task controls. */
  background?: ReactNode;
  /** Handles safe-area insets when the surrounding ScreenWrapper draws edge to edge. */
  edgeToEdge?: boolean;
}>;

/** Stable task layout: capability-focused header and an information/storage sheet. */
export function TaskScreen({
  title,
  status,
  model,
  error,
  busy,
  children,
  scrollable = true,
  background,
  edgeToEdge = false,
}: TaskScreenProps) {
  const appearance = background ? 'dark' : undefined;
  const { colors, scheme } = useTheme(appearance);
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);
  const { loaded, loadFailed, refreshCache } = model;
  useEffect(() => {
    if (status.resource || status.isReady) void refreshCache();
  }, [status.resource, status.isReady, refreshCache]);
  useEffect(() => {
    if (loaded && status.error) loadFailed(status.error);
  }, [loaded, status.error, loadFailed]);

  const modelError =
    loaded && status.error
      ? status.error instanceof Error
        ? status.error.message
        : String(status.error)
      : null;
  const message = error || model.error || modelError;
  const Content = scrollable ? ScrollView : View;

  return (
    <View
      style={[
        styles.root,
        edgeToEdge && styles.edgeToEdge,
        edgeToEdge && { paddingBottom: insets.bottom },
      ]}
    >
      {background && <StatusBar style="light" />}
      {background && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {background}
        </View>
      )}
      <View style={edgeToEdge && { paddingTop: insets.top }}>
        {background && (
          <BlurView
            style={StyleSheet.absoluteFill}
            tint={scheme}
            intensity={tokens.camera.chromeBlurIntensity}
          />
        )}
        <PageHeader
          title={title}
          subtitle={model.info.name}
          appearance={appearance}
          backLabel="Back to all demos"
          onBack={() => router.dismissTo('/tasks')}
          action={
            <IconButton
              icon="ellipsis-horizontal"
              accessibilityLabel="Model status and storage"
              appearance={appearance}
              onPress={() => setMenuVisible(true)}
            />
          }
        />
      </View>
      <Content
        {...(scrollable
          ? { contentContainerStyle: styles.content, showsVerticalScrollIndicator: false }
          : { style: styles.fixedContent })}
      >
        <View style={scrollable ? styles.viewport : styles.fixedViewport}>{children}</View>
        {message && (
          <AppText variant="secondary" accessibilityRole="alert" style={{ color: colors.danger }}>
            {message}
          </AppText>
        )}
      </Content>
      <ModelSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        model={model}
        status={status}
        busy={busy}
      />
    </View>
  );
}

const { spacing, layout } = tokens;
const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
  edgeToEdge: { maxWidth: '100%' },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  viewport: { flex: 1, minHeight: layout.photoMinHeight },
  fixedContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  fixedViewport: { flex: 1 },
});
