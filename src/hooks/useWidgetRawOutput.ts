import { useEffect, useMemo, useRef, useState } from 'react';
import type { ScrollView } from 'react-native';
import { formatWidgetOutput } from '@/lib/format-widget-output';

/** Polls the raw generation buffer only while the debug modal is visible; keeps token updates out of the widget tree. */
export function useWidgetRawOutput(readOutput: () => string, visible: boolean, busy: boolean) {
  const [output, setOutput] = useState('');
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (!visible) return;
    const refresh = () => setOutput(readOutput());
    refresh();
    if (!busy) return;
    const timer = setInterval(refresh, 100);
    return () => clearInterval(timer);
  }, [readOutput, visible, busy]);
  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [output, visible]);
  const formatted = useMemo(() => formatWidgetOutput(output), [output]);
  return { output: formatted, scroll };
}
