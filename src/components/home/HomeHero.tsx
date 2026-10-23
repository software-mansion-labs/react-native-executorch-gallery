import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ExecuTorchLogo } from '@/components/home/ExecuTorchLogo';
import { tokens } from '@/theme';

/** Centers the brand mark and home headline above the discovery links. */
export function HomeHero() {
  return (
    <View style={styles.hero}>
      <View style={styles.logoSpace}>
        <ExecuTorchLogo />
      </View>
      <AppText variant="hero" accessibilityRole="header" style={styles.headline}>
        {'A little wonder.\nAll on your phone.'}
      </AppText>
    </View>
  );
}

const { spacing } = tokens;

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
  },
  logoSpace: {
    marginBottom: spacing.xl,
  },
  headline: {
    textAlign: 'center',
  },
});
