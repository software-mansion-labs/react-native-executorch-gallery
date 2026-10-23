import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { tokens, useTheme } from '@/theme';

type SweepingHeadlineProps = {
  current: string;
  next: string;
  progress: Animated.Value;
};

/**
 * Replaces a headline from left to right using the logo's animation clock.
 * Keeps the text masks static and moves their gradient content, allowing Android
 * to retain hardware rendering during navigation transitions.
 */
export function SweepingHeadline({ current, next, progress }: SweepingHeadlineProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const maskWidth = width * 2 + heroWipe.featherWidth;
  const locations = [0, width / maskWidth, (width + heroWipe.featherWidth) / maskWidth, 1] as const;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-width - heroWipe.featherWidth, 0],
  });

  const headlines = [
    {
      text: current,
      colors: [
        heroWipe.transparentColor,
        heroWipe.transparentColor,
        colors.text,
        colors.text,
      ] as const,
    },
    {
      text: next,
      colors: [
        colors.text,
        colors.text,
        heroWipe.transparentColor,
        heroWipe.transparentColor,
      ] as const,
    },
  ];

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AppText variant="hero" style={[styles.text, width > 0 && styles.placeholder]}>
        {current}
      </AppText>
      {width > 0 &&
        headlines.map((headline, index) => (
          <MaskedView
            key={index}
            style={styles.line}
            maskElement={
              <View style={styles.line}>
                <AppText variant="hero" style={styles.text}>
                  {headline.text}
                </AppText>
              </View>
            }
          >
            <Animated.View style={[styles.mask, { width: maskWidth, transform: [{ translateX }] }]}>
              <LinearGradient
                colors={headline.colors}
                locations={locations}
                start={heroWipe.start}
                end={heroWipe.end}
                style={styles.fill}
              />
            </Animated.View>
          </MaskedView>
        ))}
    </View>
  );
}

const { heroWipe, opacity } = tokens;

const styles = StyleSheet.create({
  text: {
    textAlign: 'center',
  },
  placeholder: {
    opacity: opacity.hidden,
  },
  line: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mask: {
    height: '100%',
  },
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
