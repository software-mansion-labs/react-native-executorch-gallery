import { StyleSheet, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { WidgetChecklist } from '@/components/WidgetChecklist';
import { WidgetChoices } from '@/components/WidgetChoices';
import { WidgetRating } from '@/components/WidgetRating';
import { WidgetTimer } from '@/components/WidgetTimer';
import { WidgetToggle } from '@/components/WidgetToggle';
import { useWidgetAppearance } from '@/hooks/useWidgetAppearance';
import type { WidgetValue, ChecklistItem } from '@/hooks/useWidgetValues';
import type { AppControl, WidgetAppearance } from '@/lib/app-builder';
import { widgetExpansion } from '@/lib/widget-motion';
import { tokens } from '@/theme';

/** Supported local controls, using only accent roles from the selected curated palette. */
export function WidgetControl({
  control,
  value,
  onChange,
  disabled,
  settings,
  resetVersion,
}: {
  control: AppControl;
  value: WidgetValue;
  onChange: (value: WidgetValue) => void;
  disabled: boolean;
  settings: WidgetAppearance;
  resetVersion: number;
}) {
  const look = useWidgetAppearance(settings, control.accent);
  const { colors, appearance, fontFamily } = look;
  const count = Number(value) || 0;
  const goal = control.type === 'goal-counter' ? control.target : undefined;
  const step = control.type === 'goal-counter' ? (control.step ?? 1) : 1;
  const adjustCount = (direction: number) => {
    const next = Math.round((count + direction * step) * 1000) / 1000;
    onChange(Math.max(0, goal === undefined ? next : Math.min(goal, next)));
  };
  const numberStyle = control.emphasis
    ? [look.text.number, tokens.typography.hero]
    : look.text.number;
  return (
    <View style={styles.field}>
      {control.type === 'toggle' ? (
        <WidgetToggle
          label={control.label}
          value={!!value}
          disabled={disabled}
          onChange={onChange}
          look={look}
        />
      ) : (
        <>
          <AppText style={look.text.body}>{control.label}</AppText>
          {(control.type === 'text' || control.type === 'number-input') && (
            <TextInput
              editable={!disabled}
              accessibilityLabel={control.label}
              placeholder={control.type === 'number-input' ? '0' : control.label}
              placeholderTextColor={colors.muted}
              value={String(value)}
              keyboardType={control.type === 'number-input' ? 'numeric' : 'default'}
              onChangeText={(next) => {
                if (control.type === 'text' || /^-?\d*(?:[.,]\d*)?$/.test(next))
                  onChange(next.replace(',', control.type === 'number-input' ? '.' : ','));
              }}
              style={[
                styles.input,
                {
                  color: colors.text,
                  fontFamily,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
              selectionColor={colors.accent}
            />
          )}
          {(control.type === 'single-select' || control.type === 'multi-select') && (
            <WidgetChoices
              label={control.label}
              options={control.options}
              value={value as string | string[]}
              multiple={control.type === 'multi-select'}
              disabled={disabled}
              onChange={onChange}
              look={look}
            />
          )}
          {control.type === 'checklist' && (
            <WidgetChecklist
              items={value as ChecklistItem[]}
              onChange={onChange}
              disabled={disabled}
              look={look}
            />
          )}
          {control.type === 'rating' && (
            <WidgetRating
              label={control.label}
              value={count}
              onChange={onChange}
              disabled={disabled}
              look={look}
            />
          )}
          {control.type === 'timer' && (
            <WidgetTimer
              key={resetVersion}
              seconds={control.seconds}
              disabled={disabled}
              look={look}
            />
          )}
          {(control.type === 'counter' || control.type === 'goal-counter') && (
            <>
              <View style={styles.row}>
                <IconButton
                  icon="remove"
                  accessibilityLabel={`Decrease ${control.label}`}
                  disabled={disabled || count === 0}
                  onPress={() => adjustCount(-1)}
                  appearance={appearance}
                  color={colors.accent}
                />
                <AppText
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={[numberStyle, styles.number]}
                >
                  {goal ? `${count} / ${goal}` : count}
                </AppText>
                <IconButton
                  icon="add"
                  accessibilityLabel={`Increase ${control.label}`}
                  disabled={disabled || (goal !== undefined && count >= goal)}
                  onPress={() => adjustCount(1)}
                  appearance={appearance}
                  color={colors.accent}
                />
              </View>
              {goal !== undefined && (
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel={control.label}
                  accessibilityValue={{ min: 0, max: goal, now: count }}
                  style={[styles.track, { backgroundColor: colors.border }]}
                >
                  <Animated.View
                    layout={widgetExpansion}
                    style={[
                      styles.fill,
                      {
                        width: `${Math.min(1, count / goal) * 100}%`,
                        backgroundColor: colors.accent,
                      },
                    ]}
                  />
                </View>
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}
const { spacing, radius, layout, typography, borderWidth } = tokens;
const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  number: {
    flex: 1,
    minWidth: layout.touchTarget,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  track: { height: spacing.sm, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  input: {
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    borderRadius: radius.annotation,
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: layout.touchTarget,
    includeFontPadding: false,
  },
});
