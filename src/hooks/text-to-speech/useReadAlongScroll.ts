import { useEffect, useState } from 'react';
import { useAnimatedRef } from 'react-native-reanimated';
import { ScrollView, type LayoutChangeEvent, type TextLayoutEvent } from 'react-native';

/** Tracks native text lines and gently keeps the current spoken word in view as speech advances. */
export function useReadAlongScroll(text: string, offset: number | undefined) {
  const scroll = useAnimatedRef<ScrollView>();
  const [height, setHeight] = useState(0);
  const [lines, setLines] = useState<{ end: number; y: number }[]>([]);
  const line = offset === undefined ? undefined : lines.find((item) => offset < item.end);
  const y = line?.y;
  useEffect(() => {
    if (y !== undefined && height > 0) {
      scroll.current?.scrollTo({ y: Math.max(0, y - height / 3), animated: true });
    }
  }, [y, height, scroll]);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [text, scroll]);

  const onTextLayout = ({ nativeEvent }: TextLayoutEvent) => {
    let cursor = 0;
    const next = nativeEvent.lines.map((item) => {
      const start = text.indexOf(item.text, cursor);
      cursor = (start < 0 ? cursor : start) + item.text.length;
      return { end: cursor, y: item.y };
    });
    setLines((previous) =>
      previous.length === next.length &&
      previous.every((line, index) => line.end === next[index].end && line.y === next[index].y)
        ? previous
        : next
    );
  };
  const onLayout = ({ nativeEvent }: LayoutChangeEvent) => setHeight(nativeEvent.layout.height);
  return { scroll, onTextLayout, onLayout };
}
