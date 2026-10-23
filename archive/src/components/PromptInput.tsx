import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardStickyView } from 'react-native-keyboard-controller';

import { borderWidth, radius, spacing, useTheme } from '@/theme';
import { Icon } from '@/components/Icon';

export interface PromptInputProps {
  /** Controlled input value. */
  value: string;
  /** Callback fired when the user edits the text. */
  onChangeText: (text: string) => void;
  /** Callback fired when the user submits via send or a suggestion chip. */
  onSubmit: () => void;
  /** Optional pre-configured prompts shown as tappable chips above the bubble. */
  suggestions?: string[];
  /** Placeholder shown while the field is empty. */
  placeholder?: string;
  /** Disables editing and the submit action. */
  disabled?: boolean;
  /** Whether submitting is currently valid (e.g. not busy, input non-empty). */
  canSubmit?: boolean;
  /** Whether an active execution is in progress (e.g. synthesizing audio or generating image). Shows spinner. */
  isExecuting?: boolean;
  /** Whether an active task is running/playing that can be stopped. */
  isPlaying?: boolean;
  /** Callback fired when the user taps stop during active playback. */
  onStop?: () => void;
}

/**
 * Minimal, reusable prompt input that floats above the system keyboard as a
 * floating island card.
 *
 * The entire input — suggestion chips and text field — lives inside a single
 * elevated, inset island card that hovers above the keyboard without covering
 * the full screen width. Pinned above the keyboard via a transparent sticky
 * view so it stays reachable while typing. Suggestion chips fade out
 * gracefully at the trailing edge via a LinearGradient overlay. Meant to be
 * shared across prompt-driven screens (LLM chat, text-to-image, text-to-speech,
 * privacy filter, and so on).
 *
 * @param props Controlled value, edit/submit callbacks, suggestions, and state flags.
 * @returns A keyboard-aware floating island prompt bar with optional suggestions.
 */
export function PromptInput({
  value,
  onChangeText,
  onSubmit,
  suggestions,
  placeholder = 'Type a message…',
  disabled = false,
  canSubmit = false,
  isExecuting = false,
  isPlaying = false,
  onStop,
}: PromptInputProps) {
  const { colors } = useTheme();
  const [scrolled, setScrolled] = React.useState(false);

  const active = (canSubmit && !disabled) || (isPlaying && !!onStop);

  const handlePress = () => {
    if (isPlaying && onStop) {
      onStop();
      return;
    }
    if (canSubmit && !disabled && onSubmit) {
      onSubmit();
    }
  };

  return (
    <KeyboardStickyView offset={{ closed: 0, opened: spacing.xxs }} style={styles.sticky}>
      {/* Floating island card — inset from both edges, elevated above the content */}
      <View
        style={[
          styles.island,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {suggestions && suggestions.length > 0 ? (
          <View style={styles.suggestionsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestions}
              keyboardShouldPersistTaps="handled"
              onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.x > 0)}
              scrollEventThrottle={16}
            >
              {suggestions.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => onChangeText(suggestion)}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text
                    style={[styles.chipText, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {suggestion}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            {/* Leading fade — only visible once the user has scrolled right */}
            {scrolled ? (
              <LinearGradient
                colors={[colors.surface, `${colors.surface}00`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.fadeLeft}
                pointerEvents="none"
              />
            ) : null}
            {/* Trailing fade — transparent → surface */}
            <LinearGradient
              colors={[`${colors.surface}00`, colors.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fadeRight}
              pointerEvents="none"
            />
          </View>
        ) : null}

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { color: colors.text }]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            multiline
            onSubmitEditing={handlePress}
            returnKeyType="send"
          />
          <Pressable
            onPress={handlePress}
            disabled={!active}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: isPlaying
                  ? colors.danger
                  : active
                    ? colors.accent
                    : colors.surfaceSubtle,
              },
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {isExecuting ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : isPlaying ? (
              <Icon name="stop" size={18} color={colors.onAccent} />
            ) : (
              <Icon name="arrowUp" size={20} color={active ? colors.onAccent : colors.textMuted} />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardStickyView>
  );
}

const styles = StyleSheet.create({
  sticky: {
    width: '100%',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
  island: {
    borderRadius: radius.xl,
    borderWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  suggestionsWrapper: {
    position: 'relative',
  },
  suggestions: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  fadeLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 48,
  },
  fadeRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 48,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    height: 88,
    paddingVertical: spacing.xs + 2,
    textAlignVertical: 'top',
  },
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth,
    maxWidth: 260,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
