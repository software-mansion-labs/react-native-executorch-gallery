import { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { tokens } from '@/theme';

/** Displays finalized and provisional speech in an unframed transcript. */
export function Transcript({ committed, partial }: { committed: string; partial: string }) {
  const scroll = useRef<ScrollView>(null);
  const hasText = !!committed || !!partial;
  return (
    <View style={styles.root}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
      >
        <AppText variant="readAlong" selectable={hasText}>
          {hasText ? (
            <>
              {committed}
              {committed && partial ? ' ' : ''}
              <AppText variant="readAlong" tone="muted">
                {partial}
              </AppText>
            </>
          ) : (
            <AppText variant="readAlong" tone="muted">
              Speak naturally
            </AppText>
          )}
        </AppText>
      </ScrollView>
    </View>
  );
}
const { spacing } = tokens;
const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { paddingTop: spacing.xxxl, paddingBottom: spacing.xl },
});
