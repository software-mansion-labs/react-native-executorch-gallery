import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { tokens, useTheme } from '@/theme';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
};

/** A controlled catalogue search input with an accessible clear action.
 * Receives the current value and notifies its parent on edits. */
export function SearchField({ value, onChangeText }: SearchFieldProps) {
  const { colors, iconSize } = useTheme();
  const hasValue = value.length > 0;

  return (
    <View style={[styles.field, { backgroundColor: colors.surface }]}>
      <View style={styles.searchIcon}>
        <Ionicons name="search-outline" size={iconSize.small} color={colors.muted} />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, { color: colors.text }]}
        placeholder="Search demos"
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        accessibilityLabel="Search demos"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      <View style={styles.clearAction}>
        {hasValue && (
          <IconButton
            icon="close"
            size="small"
            tone="muted"
            accessibilityLabel="Clear search"
            onPress={() => onChangeText('')}
          />
        )}
      </View>
    </View>
  );
}

const { spacing, radius, typography, fontFamily, layout } = tokens;

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    paddingLeft: spacing.lg,
    minHeight: layout.touchTarget,
    borderRadius: radius.pill,
  },
  searchIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: layout.touchTarget,
  },
  input: {
    ...typography.input,
    fontFamily,
    flex: 1,
    minHeight: layout.touchTarget,
    paddingVertical: spacing.none,
    textAlignVertical: 'center',
    includeFontPadding: false,
    paddingHorizontal: spacing.none,
  },
  clearAction: {
    width: layout.touchTarget,
    height: layout.touchTarget,
  },
});
