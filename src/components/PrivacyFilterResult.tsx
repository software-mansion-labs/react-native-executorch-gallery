import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import type { PrivacyFilterOutput } from '@/components/PrivacyFilterView';
import { useCopyText } from '@/hooks/useCopyText';
import { usePrivacyFilterPresentation } from '@/hooks/usePrivacyFilterPresentation';
import { tokens, useTheme } from '@/theme';

/** A redacted text preview with controlled original comparison and filtered-only copying. */
export function PrivacyFilterResult({
  result,
  revealed,
}: {
  result: PrivacyFilterOutput;
  revealed: boolean;
}) {
  const { colors } = useTheme();
  const { segments, redacted, count } = usePrivacyFilterPresentation(result.text, result.entities);
  const clipboard = useCopyText(redacted);

  return (
    <Animated.View entering={entrance} style={styles.result}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Animated.View key={revealed ? 'original' : 'filtered'} entering={entrance}>
          <AppText selectable>
            {segments.map((segment, index) =>
              segment.replacement ? (
                <Text key={index} style={revealed ? styles.underline : { color: colors.muted }}>
                  {revealed ? segment.text : segment.replacement}
                </Text>
              ) : (
                segment.text
              )
            )}
          </AppText>
        </Animated.View>
        <View style={styles.meta} accessibilityLiveRegion="polite">
          <View style={styles.summary}>
            <AppText variant="caption" tone="muted">
              {count
                ? `${count} ${count === 1 ? 'detail' : 'details'} ${revealed ? 'found' : 'hidden'}`
                : 'No sensitive details found'}
            </AppText>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              · {result.latency} ms
            </AppText>
          </View>
          <IconButton
            icon={clipboard.copied ? 'checkmark' : 'copy-outline'}
            size="small"
            tone="muted"
            accessibilityLabel={clipboard.copied ? 'Filtered text copied' : 'Copy filtered text'}
            onPress={() => void clipboard.copy()}
          />
        </View>
      </View>
      {clipboard.error && (
        <AppText variant="secondary" tone="muted" accessibilityRole="alert">
          {clipboard.error}
        </AppText>
      )}
    </Animated.View>
  );
}

const entrance = FadeIn.duration(tokens.motion.photoRevealDuration).reduceMotion(
  ReduceMotion.System
);
const { spacing, radius } = tokens;
const styles = StyleSheet.create({
  result: { gap: spacing.lg },
  card: { borderRadius: radius.card, padding: spacing.xl, gap: spacing.lg },
  underline: { textDecorationLine: 'underline' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
