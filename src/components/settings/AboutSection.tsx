import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ABOUT_LINKS, APP_VERSION, EXECUTORCH_VERSION } from '@/data/appInfo';
import { useExternalLink } from '@/hooks/useExternalLink';
import { tokens, useTheme } from '@/theme';

/** App and installed-library versions, plus explicit links to documentation and source. */
export function AboutSection() {
  const { colors, iconSize } = useTheme();
  const { openLink, error } = useExternalLink();

  return (
    <View style={[styles.section, { borderTopColor: colors.border }]}>
      <AppText variant="settingsSection" tone="muted" style={styles.heading}>
        About
      </AppText>
      <View style={styles.version}>
        <AppText variant="settingsBody">Gallery</AppText>
        <AppText variant="settingsBody" tone="muted">
          {APP_VERSION}
        </AppText>
      </View>
      <View style={styles.version}>
        <AppText variant="settingsBody" style={styles.label}>
          React Native ExecuTorch
        </AppText>
        <AppText variant="settingsBody" tone="muted">
          {EXECUTORCH_VERSION}
        </AppText>
      </View>
      {ABOUT_LINKS.map((link) => (
        <Pressable
          key={link.url}
          accessibilityRole="link"
          accessibilityLabel={`${link.title}, opens in browser`}
          onPress={() => void openLink(link.url)}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <AppText variant="settingsBody" style={styles.label}>
            {link.title}
          </AppText>
          <Ionicons name="open-outline" size={iconSize.small} color={colors.muted} />
        </Pressable>
      ))}
      {error && (
        <AppText variant="caption" tone="muted">
          {error}
        </AppText>
      )}
    </View>
  );
}

const { spacing, layout, borderWidth, opacity } = tokens;

const styles = StyleSheet.create({
  section: {
    borderTopWidth: borderWidth.hairline,
    marginTop: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  heading: {
    paddingBottom: spacing.xs,
  },
  version: {
    minHeight: layout.touchTarget,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  label: {
    flex: 1,
  },
  link: {
    minHeight: layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: opacity.pressed,
  },
});
