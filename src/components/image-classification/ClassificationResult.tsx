import { StyleSheet, View } from 'react-native';
import type { Classification } from 'react-native-executorch';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { tokens } from '@/theme';

/** Shows the top prediction and confidence, keeping the photo's layout stable before inference. */
export function ClassificationResult({ result }: { result: Classification<string> | null }) {
  const label = result?.label.split(',')[0].trim() ?? '';
  const title = label.charAt(0).toUpperCase() + label.slice(1);
  const confidence = Math.max(0, Math.min(1, result?.confidence ?? 0));
  const percentage =
    confidence > 0 && confidence < 0.01 ? '<1%' : `${Math.round(confidence * 100)}%`;

  return (
    <View style={styles.area} accessibilityLiveRegion="polite">
      {result && (
        <Animated.View
          style={styles.content}
          entering={entrance}
          accessible
          accessibilityLabel={`${result.label}, ${percentage} confidence`}
        >
          <AppText variant="hero" style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            {title}
          </AppText>
          <AppText variant="discoverySubtitle" tone="accent">
            {percentage}
          </AppText>
        </Animated.View>
      )}
    </View>
  );
}

const entrance = FadeIn.duration(tokens.motion.detectionFadeDuration)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);
const styles = StyleSheet.create({
  area: { minHeight: tokens.layout.classificationResultsHeight, justifyContent: 'center' },
  content: { alignItems: 'center', gap: tokens.spacing.sm },
  title: { width: '100%', textAlign: 'center' },
});
