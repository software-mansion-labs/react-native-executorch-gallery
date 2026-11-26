import { Ionicons } from '@expo/vector-icons';
import { useRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { BlueActionSurface } from '@/components/BlueActionSurface';
import { useCircularButtonPressAnimation } from '@/hooks/useCircularButtonPressAnimation';
import { usePromptInputSize } from '@/hooks/usePromptInputSize';
import { tokens, useTheme } from '@/theme';

type PromptInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  suggestions?: readonly { label: string; prompt: string }[];
  leadingAccessory?: ReactNode;
  trailingAccessory?: ReactNode;
  attachment?: ReactNode;
  layoutMode?: 'inline' | 'toolbar';
  placeholder?: string;
  disabled?: boolean;
  canSubmit: boolean;
  isGenerating?: boolean;
  submitLabel?: string;
  stopLabel?: string;
};

/** Shared task composer with a growing field and optional examples, attachments, and controls. */
export function PromptInput({
  value,
  onChangeText,
  onSubmit,
  onStop,
  suggestions,
  leadingAccessory,
  trailingAccessory,
  attachment,
  layoutMode = 'inline',
  placeholder = 'Ask anything…',
  disabled = false,
  canSubmit,
  isGenerating = false,
  submitLabel = 'Send message',
  stopLabel = 'Stop generating',
}: PromptInputProps) {
  const { colors, iconSize, scheme } = useTheme();
  const input = useRef<TextInput>(null);
  const sizing = usePromptInputSize(value);
  const inline = layoutMode === 'inline';
  const active = isGenerating ? !!onStop : canSubmit && !disabled;
  const press = useCircularButtonPressAnimation();

  const field = (
    <View style={[styles.textSlot, inline && styles.inlineTextSlot]}>
      <Text
        style={[styles.inputText, styles.measure]}
        onLayout={sizing.onMeasure}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
      >
        {value || ' '}
      </Text>
      <TextInput
        ref={input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        cursorColor={colors.accent}
        selectionColor={colors.accent}
        accessibilityLabel="Message"
        multiline
        scrollEnabled={sizing.scrollEnabled}
        editable={!disabled && !isGenerating}
        style={[styles.inputText, styles.input, { color: colors.text, height: sizing.height }]}
      />
    </View>
  );
  const examples = !!suggestions?.length && !value && !isGenerating && (
    <Animated.View entering={suggestionEntrance}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.suggestions}
      >
        {suggestions.map(({ label, prompt }) => (
          <Pressable
            key={label}
            disabled={disabled}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: colors.promptChipBorder,
                backgroundColor: colors.promptChip,
              },
              pressed && styles.pressed,
            ]}
            hitSlop={tokens.spacing.xs}
            onPress={() => {
              onChangeText(prompt);
              input.current?.focus();
            }}
          >
            <AppText variant="secondary" numberOfLines={1}>
              {label}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.composer,
          { backgroundColor: colors.promptSurface, borderColor: colors.promptBorder },
        ]}
      >
        {attachment && <View style={styles.attachment}>{attachment}</View>}
        {!inline && field}
        {examples}
        <View style={styles.toolbar}>
          {leadingAccessory}
          {inline && field}
          <View style={styles.actions}>
            {trailingAccessory}
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={isGenerating ? stopLabel : submitLabel}
              accessibilityState={{ disabled: !active }}
              disabled={!active}
              onPress={isGenerating ? onStop : onSubmit}
              onPressIn={press.onPressIn}
              onPressOut={press.onPressOut}
              style={[styles.action, active && press.animatedStyle]}
            >
              <View
                pointerEvents="none"
                style={[
                  styles.actionFace,
                  !active && { backgroundColor: colors.promptDisabledAction },
                ]}
              >
                {active && <BlueActionSurface scheme={scheme} />}
                <Ionicons
                  name={isGenerating ? 'stop' : 'arrow-up'}
                  size={iconSize.small}
                  color={active ? tokens.actionSurface[scheme].foreground : colors.muted}
                />
              </View>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { spacing, layout, radius, typography, fontFamily, borderWidth, opacity } = tokens;
const suggestionEntrance = FadeIn.duration(tokens.motion.photoRevealDuration).reduceMotion(
  ReduceMotion.System
);
const styles = StyleSheet.create({
  root: { paddingBottom: spacing.sm },
  composer: {
    borderWidth: borderWidth.hairline,
    borderRadius: radius.sheet,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  attachment: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  textSlot: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inlineTextSlot: {
    flex: 1,
    minWidth: 0,
    paddingTop: spacing.sm - spacing.xxs,
    paddingBottom: spacing.sm + spacing.xxs,
  },
  inputText: {
    fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    fontWeight: typography.body.fontWeight,
    includeFontPadding: false,
  },
  input: { padding: spacing.none, textAlignVertical: 'top' },
  measure: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    opacity: 0,
  },
  suggestions: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: borderWidth.thin,
    minHeight: layout.promptSuggestionHeight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  action: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionFace: {
    width: layout.compactPromptActionSize,
    height: layout.compactPromptActionSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: opacity.pressed },
});
