import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { tokens } from '@/theme';

/** Shared, horizontally centred task copy; setup sits below without moving its anchor. */
export function TaskHero({
  title,
  description,
  setup,
}: {
  title: string;
  description: string;
  setup?: ReactNode;
}) {
  return (
    <View style={styles.copy}>
      <AppText variant="hero" numberOfLines={1} adjustsFontSizeToFit style={styles.title}>
        {title}
      </AppText>
      <AppText variant="discoverySubtitle" tone="muted" style={styles.description}>
        {description}
      </AppText>
      {setup && <View style={styles.setup}>{setup}</View>}
    </View>
  );
}

const { spacing } = tokens;
const styles = StyleSheet.create({
  copy: { width: '100%', alignItems: 'center', gap: spacing.xl },
  title: { width: '100%', textAlign: 'center' },
  description: { width: '100%', textAlign: 'center', paddingHorizontal: spacing.xl },
  setup: {
    position: 'absolute',
    top: '100%',
    width: '100%',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
});
