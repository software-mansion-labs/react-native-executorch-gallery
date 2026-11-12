import { LFM_AUDIO } from '@/lib/diarization/lfmAudio';
import { useTaskState } from '@/hooks/useTaskState';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useModel, useResourceDownload } from 'react-native-executorch';
import { useAudioRecorder } from '@/hooks/audio/useAudioRecorder';
import { useModelControls } from '@/hooks/useModelControls';
import {
  createMeetingPipeline,
  MEETING_CONFIG,
  type TranscriptTurn,
} from '@/lib/diarization/meeting';
import { CHUNK_SAMPLES, SAMPLE_RATE, NEMOTRON_PATH } from '@/lib/diarization/nemotron';
import { useImportedDiarizer } from './useImportedDiarizer';
import { PcmQueue } from '@/lib/diarization/pcmQueue';

const MEETING_PATHS = [
  NEMOTRON_PATH,
  LFM_AUDIO.modelPath,
  LFM_AUDIO.tokenizerPath,
  LFM_AUDIO.tokenizerConfigPath,
  LFM_AUDIO.vadModel.modelPath,
];

/** Loads explicitly requested local models and manages a bounded, memory-only microphone session.
 * Uses LFM3 Audio per speaker turn. Returns model controls, capture actions and text results.
 * Stop drains the last buffer; background, navigation, errors and Clear discard all pending audio.
 */
export function useMeetingSession() {
  const model = useModelControls(MEETING_PATHS, {
    hasLocalAssets: true,
    name: 'LFM3 Audio · Nemotron 3',
  });
  const download = useResourceDownload(MEETING_CONFIG, {
    preventLoad: !model.loaded,
  });
  const loaded = useModel(createMeetingPipeline, download.resource);
  const pipeline = loaded.model;
  const [turns, setTurns] = useTaskState<TranscriptTurn[]>([], model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const localModel = useImportedDiarizer(
    model.revision,
    model.deleting,
    model.refreshCache,
    setError
  );
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const queue = useRef(new PcmQueue(CHUNK_SAMPLES * 2));
  const active = useRef(false);
  const draining = useRef(false);
  const running = useRef(false);
  const generation = useRef(0);
  const elapsed = useRef(0);
  const mounted = useRef(true);

  const discard = useCallback(() => {
    generation.current++;
    active.current = false;
    draining.current = false;
    queue.current.clear();
    pipeline?.reset();
  }, [pipeline]);
  const captureStopped = () => {
    active.current = false;
    if (!draining.current) discard();
  };
  const recorder = useAudioRecorder(captureStopped, setError);
  const { stopRecording } = recorder;

  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        discard();
        void stopRecording();
      }
    });
    return () => {
      mounted.current = false;
      listener.remove();
      discard();
    };
  }, [discard, stopRecording]);

  const pump = async () => {
    if (running.current || !pipeline || (!draining.current && queue.current.length < CHUNK_SAMPLES))
      return;
    running.current = true;
    setProcessing(true);
    const request = generation.current;
    try {
      while (request === generation.current && (active.current || draining.current)) {
        const count =
          queue.current.length >= CHUNK_SAMPLES
            ? CHUNK_SAMPLES
            : draining.current
              ? queue.current.length
              : 0;
        if (!count) break;
        const audio = queue.current.take(count);
        const offset = elapsed.current;
        elapsed.current += count / SAMPLE_RATE;
        if (count < 1600) {
          audio.fill(0);
          continue;
        }
        const results = await pipeline.process(audio, offset);
        if (mounted.current && request === generation.current)
          setTurns((previous) => [...previous, ...results]);
      }
    } catch (cause) {
      if (mounted.current && request === generation.current)
        setError(cause instanceof Error ? cause.message : String(cause));
      discard();
      await recorder.stopRecording();
    } finally {
      running.current = false;
      if (draining.current && !queue.current.length) {
        draining.current = false;
        pipeline.reset();
      }
      if (mounted.current) setProcessing(false);
    }
  };

  const toggle = async () => {
    if (recorder.isRecording) {
      draining.current = true;
      await recorder.stopRecording();
      void pump();
      return;
    }
    if (!pipeline || !model.prepared || processing || recorder.starting) return;
    discard();
    elapsed.current = 0;
    setTurns([]);
    setError(null);
    setCopied(false);
    active.current = true;
    try {
      await recorder.startRecording(SAMPLE_RATE, (audio) => {
        if (!active.current) {
          audio.fill(0);
          return;
        }
        try {
          queue.current.push(audio);
          void pump();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause));
          discard();
          void recorder.stopRecording();
        }
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      discard();
    }
  };
  const clear = () => {
    discard();
    void recorder.stopRecording();
    setTurns([]);
    setCopied(false);
  };
  const copy = async () => {
    try {
      await Clipboard.setStringAsync(
        turns
          .map(
            (turn) =>
              `${formatTime(turn.start)} ${speakerLabel(turn.speakers, turn.overlap)}: ${turn.text ?? 'Speaking'}`
          )
          .join('\n')
      );
      setCopied(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  return {
    model,
    localModel,
    status: { ...download, isReady: !!pipeline, error: download.downloadError || loaded.error },
    turns,
    error,
    processing,
    recorder,
    toggle,
    clear,
    copy,
    copied,
  };
}

export function speakerLabel(speakers: number[], overlap = false) {
  if (!speakers.length) return 'Unassigned speaker';
  return speakers.length > 1
    ? `Overlap · ${speakers.map((id) => `Speaker ${id}`).join(' + ')}`
    : `Speaker ${speakers[0]}${overlap ? ' · overlapping voices' : ''}`;
}
export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')}`;
}
