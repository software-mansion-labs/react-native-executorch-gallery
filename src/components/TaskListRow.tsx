import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import type { Task } from '@/data/tasks';
import { tokens, useTheme } from '@/theme';

type TaskListRowProps = {
  task: Task;
};

/** Links implemented demos to their screen and labels remaining entries as coming soon. */
export function TaskListRow({ task }: TaskListRowProps) {
  const { colors, iconSize } = useTheme();
  if (task.href) {
    return (
      <Link href={task.href} asChild>
        <Pressable style={styles.row} accessibilityRole="link">
          <View style={styles.linkContent}>
            <AppText>{task.title}</AppText>
            <Ionicons name="chevron-forward" size={iconSize.small} color={colors.muted} />
          </View>
        </Pressable>
      </Link>
    );
  }
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${task.title}. Coming soon.`}
      accessibilityState={{ disabled: true }}
    >
      <AppText>{task.title}</AppText>
    </View>
  );
}

const { spacing, layout } = tokens;

const styles = StyleSheet.create({
  linkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  row: {
    minHeight: layout.taskRowMinHeight,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
});
