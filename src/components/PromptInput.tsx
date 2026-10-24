import { Ionicons } from '@expo/vector-icons';
import { useRef, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { useCardPressAnimation } from '@/hooks/useCardPressAnimation';
import { useGeneratingPulse } from '@/hooks/useGeneratingPulse';
import { tokens, useTheme } from '@/theme';

type PromptInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  suggestions?: readonly { label: string; prompt: string }[];
  reserveSuggestionSpace?: boolean;
  leadingAccessory?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  canSubmit: boolean;
  isGenerating?: boolean;
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
  placeholder = 'Ask anything…',
  disabled = false,
  canSubmit,
  isGenerating = false,
}: PromptInputProps) {
  const { colors, iconSize } = useTheme();
  const input = useRef<TextInput>(null);
  const press = useCardPressAnimation();
  const generatingPulse = useGeneratingPulse(isGenerating);
  const active = isGenerating ? !!onStop : canSubmit && !disabled;
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
        <View style={styles.inputSlot}>
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
            editable={!disabled && !isGenerating}
            style={[styles.input, { color: colors.text }]}
          />
        </View>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={isGenerating ? 'Stop generating' : 'Send message'}
          accessibilityState={{ disabled: !active }}
          disabled={!active}
          onPress={isGenerating ? onStop : onSubmit}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          style={[
            styles.send,
            { backgroundColor: colors.accent },
            !active && styles.disabled,
            press.animatedStyle,
          ]}
        >
          <Animated.View style={isGenerating ? generatingPulse : undefined}>
            <Ionicons
              name={isGenerating ? 'stop' : 'arrow-up'}
              size={iconSize.medium}
              color={colors.onAccent}
            />
          </Animated.View>
        </AnimatedPressable>
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
  root: { gap: spacing.lg, paddingBottom: spacing.md },
  suggestionSpace: {
    minHeight: layout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  suggestionList: { flex: 1, minWidth: 0 },
  suggestions: { flexGrow: 1, justifyContent: 'center', gap: spacing.sm },
  chip: {
    borderRadius: radius.pill,
    borderWidth: borderWidth.thin,
    minHeight: layout.promptSuggestionHeight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: radius.sheet,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  input: {
    fontFamily,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    includeFontPadding: false,
    maxHeight: layout.chatInputMaxHeight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    textAlignVertical: 'top',
  },
  inputSlot: { flex: 1, minHeight: layout.touchTarget, justifyContent: 'center' },
  send: {
    width: layout.touchTarget,
    height: layout.touchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: opacity.pressed },
  disabled: { opacity: opacity.disabled },
});
