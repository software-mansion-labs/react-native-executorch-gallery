import MaskedView from '@react-native-masked-view/masked-view';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, StyleSheet, View } from 'react-native';

import { useLogoAnimation } from '@/hooks/useLogoAnimation';
import { tokens, useTheme } from '@/theme';

const LOGO = require('@/assets/images/logo-hero.svg');

/** The official mark with an occasional, shape-clipped horizontal shine. */
export function ExecuTorchLogo() {
  const { logoShine } = useTheme();
  const { shinePosition } = useLogoAnimation();

  return (
    <View style={styles.logo} accessible accessibilityLabel="ExecuTorch">
      <Image source={LOGO} style={styles.fill} contentFit="contain" />
      <MaskedView
        style={styles.fill}
        pointerEvents="none"
        maskElement={<Image source={LOGO} style={styles.logo} contentFit="contain" />}
      >
        <Animated.View style={[styles.logo, { transform: [{ translateX: shinePosition }] }]}>
          <LinearGradient
            colors={logoShine.colors}
            start={logoShine.start}
            end={logoShine.end}
            style={styles.fill}
          />
        </Animated.View>
      </MaskedView>
    </View>
  );
}

const { layout } = tokens;

const styles = StyleSheet.create({
  logo: {
    width: layout.logoWidth,
    height: layout.logoHeight,
  },
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
