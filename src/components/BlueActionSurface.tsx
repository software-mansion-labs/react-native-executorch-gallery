import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { tokens, type Theme } from '@/theme';

/** Decorative fill and rim for a pill-shaped primary action. */
export function BlueActionSurface({ scheme }: { scheme: Theme['scheme'] }) {
  const { fill, rim } = tokens.actionSurface[scheme];
  return (
    <LinearGradient colors={rim} pointerEvents="none" style={styles.rim}>
      <LinearGradient
        colors={fill}
        locations={tokens.actionSurface.fillStops}
        style={styles.fill}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  rim: { ...StyleSheet.absoluteFill, borderRadius: tokens.radius.pill },
  fill: {
    position: 'absolute',
    inset: tokens.borderWidth.thin,
    borderRadius: tokens.radius.pill,
  },
});
