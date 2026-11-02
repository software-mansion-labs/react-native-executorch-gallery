import { useEffect, useRef, useState } from 'react';

import {
  pickMedia,
  readMedia,
  sampleMedia,
  mediaStorySections,
  releaseMediaPreviews,
  type MediaFrame,
  type MediaItem,
} from '@/lib/media-stories/media';

type Describe = (
  item: MediaItem,
  frames: MediaFrame[],
  onToken: (token: string) => void
) => Promise<string | null>;

/**
 * Owns a bounded collection and a cancellable sequential analysis queue. Receives
 * the screen's library call and stop action; returns selection, picking, progress,
 * and per-item results. Completed items survive cancellation and can be browsed.
 */
export function useMediaCollection(describe: Describe, stopGeneration: (() => void) | undefined) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false);
  const cancelled = useRef(false);
  const mounted = useRef(true);
  const stopRef = useRef(stopGeneration);
  const collection = useRef(items);
  useEffect(() => {
    stopRef.current = stopGeneration;
  }, [stopGeneration]);
  useEffect(() => {
    collection.current = items;
  }, [items]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancelled.current = true;
      stopRef.current?.();
      releaseMediaPreviews(collection.current);
    };
  }, []);
  const update = (id: string, patch: Partial<MediaItem>) => {
    if (mounted.current)
      setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };
  const replace = (next: MediaItem[]) => {
    releaseMediaPreviews(collection.current);
    collection.current = next;
    setItems(next);
    setSelectedId(next[0]?.id);
    setError(null);
  };
  const choose = async () => {
    if (active.current || picking) return;
    setPicking(true);
    setError(null);
    try {
      const next = await pickMedia();
      if (!mounted.current) {
        releaseMediaPreviews(next);
        return;
      }
      if (next.length) replace(next);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (mounted.current) setPicking(false);
    }
  };
  const run = async () => {
    if (active.current || picking) return;
    const pending = items.filter((item) => item.phase !== 'done');
    if (!pending.length) return;
    active.current = true;
    cancelled.current = false;
    setBusy(true);
    setError(null);
    try {
      for (const item of pending) {
        if (cancelled.current) break;
        setSelectedId(item.id);
        update(item.id, {
          phase: 'reading',
          error: undefined,
          description: '',
          framesRead: 0,
          frameTime: 0,
        });
        const started = Date.now();
        try {
          const frames = await readMedia(item, (framesRead, frameCount, frameTime) => {
            if (!cancelled.current) update(item.id, { framesRead, frameCount, frameTime });
          });
          if (cancelled.current) {
            update(item.id, { phase: 'queued' });
            break;
          }
          update(item.id, { phase: 'describing' });
          let text = '';
          let published = 0;
          const answer = await describe(item, frames, (token) => {
            if (cancelled.current) return;
            text += token;
            if (Date.now() - published < 60) return;
            published = Date.now();
            update(item.id, { description: text });
          });
          if (cancelled.current || answer === null) {
            update(item.id, { phase: 'queued', description: '' });
            break;
          }
          if (!answer.trim() || !mediaStorySections(answer).summary)
            throw new Error('No description was generated. Try this item again.');
          update(item.id, { phase: 'done', description: answer, latency: Date.now() - started });
        } catch (cause) {
          update(
            item.id,
            cancelled.current
              ? { phase: 'queued', description: '' }
              : {
                  phase: 'error',
                  error: cause instanceof Error ? cause.message : String(cause),
                  description: '',
                }
          );
          if (cancelled.current) break;
        }
      }
    } finally {
      active.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return {
    items,
    selected: items.find((item) => item.id === selectedId) ?? items[0],
    select: setSelectedId,
    busy,
    picking,
    error,
    choose,
    run,
    samples: () => {
      if (!active.current && !picking) replace(sampleMedia());
    },
    stop: () => {
      cancelled.current = true;
      stopRef.current?.();
    },
  };
}
export type MediaCollection = ReturnType<typeof useMediaCollection>;
