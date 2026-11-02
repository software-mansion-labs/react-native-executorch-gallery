import { Ionicons } from '@expo/vector-icons';
import { useRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { useCircularButtonPressAnimation } from '@/hooks/useCircularButtonPressAnimation';
import { usePromptInputSize } from '@/hooks/usePromptInputSize';
import { tokens, useTheme } from '@/theme';

type PromptInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  suggestions?: readonly { label: string; prompt: string }[];
  reserveSuggestionSpace?: boolean;
  leadingAccessory?: ReactNode;
  attachment?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  canSubmit: boolean;
  isGenerating?: boolean;
  submitLabel?: string;
  stopLabel?: string;
};

/** Shared one-line composer that grows with the draft; examples fill it for editing. */
export function PromptInput({
  value,
  onChangeText,
  onSubmit,
  onStop,
  suggestions,
  reserveSuggestionSpace = false,
  leadingAccessory,
  attachment,
  placeholder = 'Ask anything…',
  disabled = false,
  canSubmit,
  isGenerating = false,
  submitLabel = 'Send message',
  stopLabel = 'Stop generating',
}: PromptInputProps) {
  const { colors, iconSize } = useTheme();
  const input = useRef<TextInput>(null);
  const sizing = usePromptInputSize(value);
  const active = isGenerating ? !!onStop : canSubmit && !disabled;
  const press = useCircularButtonPressAnimation(!active);
  return (
    <View style={styles.root}>
      {(reserveSuggestionSpace || !!suggestions?.length || !!leadingAccessory) && (
        <View style={styles.suggestionSpace}>
          {leadingAccessory}
          {!!suggestions?.length && (
            <Animated.View entering={suggestionEntrance} style={styles.suggestionList}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.suggestions}
              >
                {suggestions.map(({ label, prompt }) => (
                  <Pressable
                    key={label}
                    disabled={disabled || isGenerating}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        borderColor: colors.border,
                        backgroundColor: pressed ? colors.surface : colors.background,
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
          )}
        </View>
      )}
      <View style={[styles.composer, { backgroundColor: colors.surface }]}>
        <View style={styles.composerRow}>
          <View style={styles.inputSlot}>
            {attachment && <View style={styles.attachment}>{attachment}</View>}
            <View style={styles.textSlot}>
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
                accessibilityHint={disabled ? 'Load the model to start a conversation' : undefined}
                multiline
                scrollEnabled={sizing.scrollEnabled}
                editable={!disabled && !isGenerating}
                style={[
                  styles.inputText,
                  styles.input,
                  { color: colors.text, height: sizing.height },
                ]}
              />
            </View>
          </View>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={isGenerating ? stopLabel : submitLabel}
            accessibilityState={{ disabled: !active }}
            disabled={!active}
            onPress={isGenerating ? onStop : onSubmit}
            onPressIn={press.onPressIn}
            onPressOut={press.onPressOut}
            style={[styles.send, { backgroundColor: colors.accent }, press.animatedStyle]}
          >
            <Ionicons
              name={isGenerating ? 'stop' : 'arrow-up'}
              size={iconSize.medium}
              color={colors.onAccent}
            />
          </AnimatedPressable>
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
  root: { gap: spacing.sm, paddingBottom: spacing.sm },
  suggestionSpace: {
    minHeight: layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  suggestionList: { flex: 1, minWidth: 0 },
  suggestions: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: borderWidth.thin,
    minHeight: layout.promptSuggestionHeight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  composer: {
    borderRadius: radius.sheet,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  attachment: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  inputText: {
    fontFamily,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    includeFontPadding: false,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  input: { maxHeight: layout.chatInputMaxHeight, textAlignVertical: 'top' },
  measure: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
  inputSlot: { flex: 1, minHeight: layout.touchTarget, justifyContent: 'center', gap: spacing.sm },
  textSlot: { minHeight: layout.touchTarget, justifyContent: 'center' },
  send: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: opacity.pressed },
});
