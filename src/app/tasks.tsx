import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, SectionList, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { PageHeader } from '@/components/PageHeader';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { SearchField } from '@/components/SearchField';
import { TaskListRow } from '@/components/TaskListRow';
import { filterTasks } from '@/data/tasks';
import { tokens } from '@/theme';

export default function TaskListScreen() {
  const params = useLocalSearchParams<{ query?: string }>();
  const [query, setQuery] = useState(params.query ?? '');
  const sections = filterTasks(query);

  return (
    <ScreenWrapper>
      <View style={styles.content}>
        <PageHeader title="All demos" onBack={() => router.dismissTo('/')} />
        <SearchField value={query} onChangeText={setQuery} />
        <SectionList
          sections={sections}
          keyExtractor={(task) => task.id}
          renderItem={({ item }) => <TaskListRow task={item} />}
          renderSectionHeader={({ section }) => (
            <AppText variant="label" tone="muted" style={styles.sectionHeading}>
              {section.title}
            </AppText>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppText style={styles.center}>No demos found</AppText>
              <AppText variant="label" tone="muted" style={styles.center}>
                Try a task name, like chat or speech.
              </AppText>
            </View>
          }
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenWrapper>
  );
}

const { spacing, layout } = tokens;

const styles = StyleSheet.create({
  content: {
    flex: 1,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  sectionHeading: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  empty: {
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  center: {
    textAlign: 'center',
  },
});
