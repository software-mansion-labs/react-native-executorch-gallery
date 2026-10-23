import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import type { Task } from '@/data/tasks';
import { tokens } from '@/theme';

type TaskListRowProps = {
  task: Task;
};

/** Displays a catalogue placeholder. Intentionally has no navigation action
 * until the corresponding task screen is implemented. */
export function TaskListRow({ task }: TaskListRowProps) {
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
  row: {
    minHeight: layout.taskRowMinHeight,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
});
