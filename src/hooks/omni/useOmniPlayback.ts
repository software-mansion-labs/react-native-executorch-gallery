import { useCallback, useEffect, useRef, useState } from 'react';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { createOmniPlayback } from '@/lib/omni/playback';
import { tokens } from '@/theme';

type Playback = { id: number; queue?: Awaited<ReturnType<typeof createOmniPlayback>> };

/** Owns buffered streaming/replay, meters native PCM playback and drops cancelled or stale chunks. */
export function useOmniPlayback(revision: number, onError: (message: string) => void) {
  const operation = useRef<Playback | null>(null);
  const recordings = useRef(new Map<number, Float32Array>());
  const errorHandler = useRef(onError);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const level = useSharedValue(0);
  useEffect(() => {
    errorHandler.current = onError;
  }, [onError]);
  const stop = useCallback(() => {
    const current = operation.current;
    operation.current = null;
    current?.queue?.stop();
    setActiveId(null);
    setPlaying(false);
    setBuffering(false);
    level.set(withTiming(0, { duration: tokens.motion.speechLevelDuration }));
  }, [level]);
  useEffect(() => {
    const saved = recordings.current;
    saved.clear();
    return () => {
      stop();
      saved.clear();
    };
  }, [revision, stop]);
  const begin = useCallback(
    async (id: number) => {
      stop();
      const current: Playback = { id };
      operation.current = current;
      setActiveId(id);
      try {
        const queue = await createOmniPlayback({
          onPlaying: (value) => {
            if (operation.current === current) {
              setPlaying(value);
              setBuffering(!value && !current.queue?.getStats().closed);
            }
          },
          onLevel: (value) => {
            if (operation.current === current)
              level.set(
                withTiming(Math.min(1, value * tokens.layout.speechLevelGain), {
                  duration:
                    value * tokens.layout.speechLevelGain > level.get()
                      ? tokens.motion.speechLevelAttackDuration
                      : tokens.motion.speechLevelReleaseDuration,
                })
              );
          },
          onEnd: () => {
            if (operation.current === current) stop();
          },
        });
        if (operation.current !== current) {
          queue.stop();
          return false;
        }
        current.queue = queue;
        return true;
      } catch (cause) {
        if (operation.current === current) {
          stop();
          errorHandler.current(String(cause));
        }
        return false;
      }
    },
    [level, stop]
  );
  const enqueue = useCallback(
    (id: number, samples: Float32Array, final: boolean) => {
      const current = operation.current;
      if (current?.id !== id) return;
      try {
        if (samples.length && !current.queue?.getStats().playing && !final) setBuffering(true);
        current.queue?.enqueue(samples, final);
      } catch (cause) {
        stop();
        errorHandler.current(String(cause));
      }
    },
    [stop]
  );
  const finalize = useCallback(
    (id: number, audio: Float32Array) => {
      // Like the TTS hook, retain replay PCM privately, never in public state/props.
      recordings.current.set(id, audio);
      const current = operation.current;
      if (current?.id !== id || !current.queue) return;
      // Generation's result is authoritative even if its scheduled RN stream
      // callbacks are still pending. Supply only the missing PCM suffix, then
      // close input; later duplicate callbacks are ignored by the final queue.
      enqueue(id, audio.subarray(current.queue.getStats().samples), true);
    },
    [enqueue]
  );
  const replay = useCallback(
    async (id: number) => {
      const samples = recordings.current.get(id);
      if (!samples?.length) return;
      if (await begin(id)) enqueue(id, samples, true);
    },
    [begin, enqueue]
  );
  return {
    activeId,
    playing,
    speaking: playing,
    buffering,
    level,
    begin,
    enqueue,
    finalize,
    replay,
    stop,
  };
}
