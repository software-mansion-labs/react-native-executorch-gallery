import { useCallback, useEffect, useRef } from 'react';

import { useTaskState } from '@/hooks/useTaskState';
import { readWidgetBuild } from '@/lib/widget-builder/app-builder';

/**
 * Buffers raw generation tokens without rendering each one. Publishes a preview only
 * when appearance, a title, description, or whole control completes, keeping layout and animation
 * work proportional to visible building steps. Ignores callbacks after unmount.
 */
export function useWidgetBuildStream(revision: number) {
  const text = useRef('');
  const published = useRef(readWidgetBuild(''));
  const mounted = useRef(true);
  const [preview, setPreview] = useTaskState(readWidgetBuild(''), revision);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const append = useCallback(
    (token: string) => {
      if (!mounted.current) return;
      text.current += token;
      if (!token.includes('"') && !token.includes('}')) return;
      const next = readWidgetBuild(text.current);
      const previous = published.current;
      if (
        previous.appearanceReady === next.appearanceReady &&
        JSON.stringify(previous.appearance) === JSON.stringify(next.appearance) &&
        previous.title === next.title &&
        previous.description === next.description &&
        previous.controls.length === next.controls.length
      )
        return;
      published.current = next;
      setPreview(next);
    },
    [setPreview]
  );
  const readOutput = useCallback(() => text.current, []);
  const reset = async () => {
    text.current = '';
    published.current = readWidgetBuild('');
    setPreview(published.current);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    return mounted.current;
  };
  return { preview, append, reset, readOutput };
}
