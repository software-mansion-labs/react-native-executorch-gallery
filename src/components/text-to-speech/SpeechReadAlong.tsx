import { Text } from 'react-native';
import Animated, {
  FadeIn,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { memo, useEffect } from 'react';
import type { KokoroTtsWord } from 'react-native-executorch';

import { AppText } from '@/components/AppText';
import { tokens, useTheme } from '@/theme';

const Word = memo(function Word({ text, active }: { text: string; active: boolean }) {
  const { colors } = useTheme();
  const emphasis = useSharedValue(0);
  useEffect(() => {
    emphasis.set(
      withTiming(active ? 1 : 0, {
        duration: tokens.motion.chatDisclosureFadeDuration,
        reduceMotion: ReduceMotion.System,
      })
    );
  }, [active, emphasis]);
  const style = useAnimatedStyle(() => ({
    color: interpolateColor(emphasis.get(), [0, 1], [colors.text, colors.accent]),
  }));
  return (
    <Animated.Text
      style={[
        style,
        { textDecorationLine: active ? 'underline' : 'none', textDecorationColor: colors.accent },
      ]}
    >
      {text}
    </Animated.Text>
  );
});

/** Keeps the input's exact spacing and punctuation while emphasizing only the word currently playing. */
export function SpeechReadAlong({
  text,
  words,
  activeWord,
  onTextLayout,
}: {
  text: string;
  words: readonly KokoroTtsWord[];
  activeWord: number;
  onTextLayout: React.ComponentProps<typeof Text>['onTextLayout'];
}) {
  const parts = words.map((word, index) => {
    const previous = words[index - 1];
    const cursor = previous ? previous.offset + previous.text.length : 0;
    const before = text.slice(cursor, word.offset);
    return (
      <Text key={`${word.offset}:${index}`}>
        {before}
        <Word text={word.text} active={activeWord === index} />
      </Text>
    );
  });
  const last = words[words.length - 1];
  const cursor = last ? last.offset + last.text.length : 0;
  return (
    <Animated.View
      entering={FadeIn.duration(tokens.motion.photoRevealDuration).reduceMotion(
        ReduceMotion.System
      )}
    >
      <AppText variant="readAlong" onTextLayout={onTextLayout}>
        {parts}
        {text.slice(cursor)}
      </AppText>
    </Animated.View>
  );
}
