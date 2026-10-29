import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioContext, type AudioBufferQueueSourceNode } from 'react-native-audio-api';
import {
  KOKORO_SAMPLE_RATE,
  type KokoroTtsChunk,
  type KokoroTtsWord,
} from 'react-native-executorch';

import { useTaskState } from '@/hooks/useTaskState';

type Playback = {
  cancelled: boolean;
  source?: AudioBufferQueueSourceNode;
  finish: () => void;
};

type RecordedSpeech = { text: string; chunks: readonly KokoroTtsChunk[] };

/**
 * Plays Kokoro's streamed PCM and follows native playback position with its word timings.
 * Accepts the library's cancellation method and model revision; clears results on deletion
 * and stops queued audio and synthesis on unmount.
 * Retains the last fully generated speech in memory for replay without running the model.
 * Returns the spoken text, current word, playback state, and stream/replay/stop controls.
 * Completion waits for both synthesis and the last enqueued buffer, including queue underruns.
 */
export function useSpeechPlayback(cancelSynthesis: (() => void) | undefined, revision: number) {
  const operation = useRef<Playback | null>(null);
  const [text, setText] = useTaskState('', revision);
  const [words, setWords] = useTaskState<readonly KokoroTtsWord[]>([], revision);
  const [recording, setRecording] = useTaskState<RecordedSpeech | null>(null, revision);
  const [activeWord, setActiveWord] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);

  const stop = useCallback(() => {
    const current = operation.current;
    if (!current || current.cancelled) return;
    current.cancelled = true;
    cancelSynthesis?.();
    current.source?.clearBuffers();
    current.source?.stop();
    current.source = undefined;
    current.finish();
    setPlaying(false);
    setActiveWord(-1);
  }, [cancelSynthesis]);

  useEffect(() => () => stop(), [stop]);

  const playStream = async (
    input: string,
    chunks: AsyncIterable<KokoroTtsChunk>,
    replaying: boolean
  ) => {
    if (operation.current) return;
    if (!replaying) setRecording(null);
    let resolveFinished = () => {};
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });
    const current: Playback = { cancelled: false, finish: resolveFinished };
    operation.current = current;
    setText(input);
    setWords([]);
    setActiveWord(-1);
    setBusy(true);
    let context: AudioContext | undefined;
    try {
      context = new AudioContext({ sampleRate: KOKORO_SAMPLE_RATE });
      if (context.state === 'suspended') await context.resume();
      if (current.cancelled) return;
      const source = context.createBufferQueueSource();
      current.source = source;
      source.connect(context.destination);
      let started = false;
      let streamDone = false;
      let lastBufferId: string | null = null;
      let endedBufferId: string | null = null;
      const timedWords: KokoroTtsWord[] = [];
      const recordedChunks: KokoroTtsChunk[] = [];
      const finishIfDone = () => {
        if (streamDone && lastBufferId === endedBufferId) current.finish();
      };
      source.onBufferEnded = (event) => {
        if (current.cancelled) return;
        endedBufferId = event.bufferId ?? null;
        finishIfDone();
      };
      source.onPositionChangedInterval = 50;
      source.onPositionChanged = ({ value }) => {
        if (current.cancelled) return;
        const index = timedWords.findIndex((word) => value >= word.start && value < word.end);
        setActiveWord((previous) => (previous === index ? previous : index));
      };
      for await (const chunk of chunks) {
        if (current.cancelled) break;
        if (!chunk.audio.length) continue;
        if (!replaying) recordedChunks.push(chunk);
        const buffer = context.createBuffer(1, chunk.audio.length, chunk.sampleRate);
        buffer.copyToChannel(chunk.audio as Float32Array<ArrayBuffer>, 0);
        lastBufferId = source.enqueueBuffer(buffer);
        timedWords.push(...chunk.words);
        setWords([...timedWords]);
        if (!started) {
          started = true;
          source.start(0, 0);
          setPlaying(true);
        }
      }
      streamDone = true;
      if (!replaying && !current.cancelled && recordedChunks.length) {
        setRecording({ text: input, chunks: recordedChunks });
      }
      finishIfDone();
      await finished;
    } catch (cause) {
      if (!current.cancelled) {
        cancelSynthesis?.();
        throw cause;
      }
    } finally {
      // Keep the run gate closed until the cancelled generator has also unwound.
      current.cancelled = true;
      current.source?.clearBuffers();
      current.source?.stop();
      if (context) await context.close().catch(() => {});
      if (operation.current === current) {
        operation.current = null;
        setBusy(false);
        setPlaying(false);
        setActiveWord(-1);
      }
    }
  };

  const play = (input: string, chunks: AsyncIterable<KokoroTtsChunk>) =>
    playStream(input, chunks, false);
  const replay = async () => {
    if (!recording) return;
    const savedChunks = recording.chunks;
    async function* chunks() {
      yield* savedChunks;
    }
    await playStream(recording.text, chunks(), true);
  };

  return {
    text,
    words,
    activeWord,
    busy,
    playing,
    canReplay: !!recording && !busy,
    play,
    replay,
    stop,
  };
}
