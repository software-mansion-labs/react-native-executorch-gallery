import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ExecuTorchLogo } from '@/components/home/ExecuTorchLogo';
import { SweepingHeadline } from '@/components/home/SweepingHeadline';
import { useHomeHeroAnimation } from '@/hooks/useHomeHeroAnimation';
import { tokens } from '@/theme';

const HEADLINES = ['A little wonder.', 'A spark of magic.', 'A small marvel.', 'A bright idea.'];

type HomeHeroProps = {
  paused?: boolean;
};

/** Centers the mark and a quietly rotating headline without moving the discovery links. */
export function HomeHero({ paused = false }: HomeHeroProps) {
  const { shinePosition, headlineIndex, progress } = useHomeHeroAnimation({
    headlineCount: HEADLINES.length,
    paused,
  });
  const headline = HEADLINES[headlineIndex];
  const nextHeadline = HEADLINES[Math.min(headlineIndex + 1, HEADLINES.length - 1)];

  return (
    <View style={styles.hero}>
      <View style={styles.logoSpace}>
        <ExecuTorchLogo shinePosition={shinePosition} />
      </View>
      <View
        style={styles.headline}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${headline} All on your phone.`}
      >
        <SweepingHeadline current={headline} next={nextHeadline} progress={progress} />
        <AppText variant="hero" style={styles.text}>
          All on your phone.
        </AppText>
      </View>
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
    width: '100%',
  },
  text: {
    textAlign: 'center',
  },
});
