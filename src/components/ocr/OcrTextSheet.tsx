import { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { IconButton } from '@/components/IconButton';
import { useCopyText } from '@/hooks/useCopyText';
import type { OcrPresentation } from '@/hooks/ocr/useOcrPresentation';
import { tokens } from '@/theme';

/** Selectable OCR lines in the library's reading order, with region selection and copy-all. */
export function OcrTextSheet({ presentation }: { presentation: OcrPresentation }) {
  const scrollRef = useRef<ScrollView>(null);
  const clipboard = useCopyText(presentation.text);
  return (
    <BottomSheet
      title="Recognized text"
      visible={presentation.visible}
      onClose={() => {
        clipboard.reset();
        presentation.close();
      }}
      scrollViewRef={scrollRef}
      action={
        <IconButton
          icon={clipboard.copied ? 'checkmark' : 'copy-outline'}
          accessibilityLabel={clipboard.copied ? 'Text copied' : 'Copy all text'}
          size="small"
          onPress={() => void clipboard.copy()}
          disabled={!presentation.text}
        />
      }
    >
      <View style={styles.content}>
        {presentation.results?.map((line, index) => {
          const selected = index === presentation.selectedIndex;
          return (
            <View
              key={index}
              onLayout={
                selected
                  ? ({ nativeEvent: { layout } }) =>
                      requestAnimationFrame(() =>
                        scrollRef.current?.scrollTo({
                          y: Math.max(0, layout.y - spacing.lg),
                          animated: false,
                        })
                      )
                  : undefined
              }
              style={styles.line}
            >
              <AppText variant="body" selectable style={selected && styles.selectedText}>
                {line.text}
              </AppText>
            </View>
          );
        })}
        {clipboard.error && (
          <AppText variant="secondary" accessibilityRole="alert" tone="muted">
            {clipboard.error}
          </AppText>
        )}
      </View>
    </BottomSheet>
  );
}

const { spacing } = tokens;
const styles = StyleSheet.create({
  content: { gap: spacing.xs, paddingBottom: spacing.lg },
  line: {
    padding: spacing.md,
  },
  selectedText: { textDecorationLine: 'underline' },
});
