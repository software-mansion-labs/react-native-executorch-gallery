import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { tokens, useTheme } from '@/theme';

type SweepingHeadlineProps = {
  headlines: readonly [string, string];
  progress: readonly [Animated.Value, Animated.Value];
};

/**
 * Alternates two stable text layers, revealing and hiding each from left to right.
 * Updates only the hidden layer's text, avoiding a text swap at the wipe boundary.
 * Keeps the text masks static and moves their gradient content, allowing Android
 * to retain hardware rendering during navigation transitions.
 */
export function SweepingHeadline({ headlines, progress }: SweepingHeadlineProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const travel = width + heroWipe.featherWidth;
  const maskWidth = travel * 2;
  const locations = [width / maskWidth, 0.5, (travel + width) / maskWidth, 1] as const;
  const gradientColors = [
    heroWipe.transparentColor,
    colors.text,
    colors.text,
    heroWipe.transparentColor,
  ] as const;

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AppText variant="hero" style={[styles.text, width > 0 && styles.placeholder]}>
        {headlines[0]}
      </AppText>
      {width > 0 &&
        headlines.map((headline, index) => (
          <MaskedView
            key={index}
            style={styles.line}
            maskElement={
              <View style={styles.line}>
                <AppText variant="hero" style={styles.text}>
                  {headline}
                </AppText>
              </View>
            }
          >
            <Animated.View
              style={[
                styles.mask,
                {
                  width: maskWidth,
                  transform: [
                    {
                      translateX: progress[index].interpolate({
                        inputRange: [0, 1, 2],
                        outputRange: [-maskWidth, -travel, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={gradientColors}
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
