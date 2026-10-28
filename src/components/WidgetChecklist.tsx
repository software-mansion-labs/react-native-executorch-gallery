import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import type { useWidgetAppearance } from '@/hooks/useWidgetAppearance';
import type { ChecklistItem } from '@/hooks/useWidgetValues';
import Animated from 'react-native-reanimated';
import { widgetReveal, widgetExit, widgetExpansion } from '@/lib/widget-motion';
import { tokens } from '@/theme';

/** Editable local checklist: check off, rename, add, and remove items without generating another widget. */
export function WidgetChecklist({
  items,
  onChange,
  disabled,
  look,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  disabled: boolean;
  look: ReturnType<typeof useWidgetAppearance>;
}) {
  const [draft, setDraft] = useState('');
  const { colors, appearance, fontFamily } = look;
  const add = () => {
    if (disabled || !draft.trim()) return;
    onChange([...items, { label: draft.trim(), done: false }]);
    setDraft('');
  };
  return (
    <View style={styles.list}>
      <AppText
        appearance={appearance}
        variant="caption"
        tone="muted"
        style={{ color: colors.muted, fontFamily }}
        accessibilityLiveRegion="polite"
      >
        {items.filter((item) => item.done).length} of {items.length} done
      </AppText>
      {items.map((item, index) => (
        <Animated.View
          key={index}
          style={styles.row}
          entering={widgetReveal(index)}
          exiting={widgetExit}
          layout={widgetExpansion}
        >
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={`Complete ${item.label}`}
            accessibilityState={{ checked: item.done, disabled }}
            disabled={disabled}
            onPress={() =>
              onChange(
                items.map((entry, position) =>
                  position === index ? { ...entry, done: !entry.done } : entry
                )
              )
            }
            style={styles.check}
          >
            <Ionicons
              name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={tokens.iconSize.medium}
              color={item.done ? colors.accent : colors.muted}
            />
          </Pressable>
          <TextInput
            accessibilityLabel={`Edit item ${index + 1}`}
            editable={!disabled}
            value={item.label}
            onChangeText={(label) =>
              onChange(
                items.map((entry, position) => (position === index ? { ...entry, label } : entry))
              )
            }
            selectionColor={colors.accent}
            style={[
              styles.text,
              {
                fontFamily,
                color: item.done ? colors.muted : colors.text,
                textDecorationLine: item.done ? 'line-through' : 'none',
              },
            ]}
          />
          <IconButton
            color={colors.muted}
            appearance={appearance}
            icon="close"
            size="small"
            tone="muted"
            disabled={disabled}
            accessibilityLabel={`Remove ${item.label}`}
            onPress={() => onChange(items.filter((_, position) => position !== index))}
          />
        </Animated.View>
      ))}
      {!disabled && (
        <View style={[styles.row, styles.add, { borderColor: colors.border }]}>
          <TextInput
            accessibilityLabel="New checklist item"
            placeholder="Add an item…"
            placeholderTextColor={colors.muted}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            returnKeyType="done"
            selectionColor={colors.accent}
            style={[styles.text, { color: colors.text, fontFamily }]}
          />
          <IconButton
            color={colors.muted}
            appearance={appearance}
            icon="add"
            accessibilityLabel="Add checklist item"
            disabled={!draft.trim()}
            onPress={add}
          />
        </View>
      )}
    </View>
  );
}
const { spacing, layout, typography } = tokens;
const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center' },
  check: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    height: layout.touchTarget,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  add: { borderTopWidth: tokens.borderWidth.thin, paddingLeft: spacing.md, marginTop: spacing.sm },
});
