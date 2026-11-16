import { FLUID_SPEECH } from '@/lib/diarization/fluidSpeech';
import { MEETING_ASSETS } from '@/lib/diarization/meetingAssets';
import { useTaskState } from '@/hooks/useTaskState';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { isDevice } from 'expo-device';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import RNBlobUtil from 'react-native-blob-util';
import { decodeAudioData } from 'react-native-audio-api';
import { useModel, useResourceDownload } from 'react-native-executorch';
import { useAudioRecorder } from '@/hooks/audio/useAudioRecorder';
import { useModelControls } from '@/hooks/useModelControls';
import {
  createMeetingPipeline,
  MEETING_CONFIG,
  type TranscriptTurn,
} from '@/lib/diarization/meeting';
import { CHUNK_SAMPLES, SAMPLE_RATE } from '@/lib/diarization/nemotron';
import { useImportedMeetingModels } from './useImportedMeetingModels';
import { PcmQueue } from '@/lib/diarization/pcmQueue';
import { appendTranscriptTurns } from '@/lib/diarization/transcript';

const MEETING_PATHS = [
  ...MEETING_ASSETS.map((asset) => asset.path),
  FLUID_SPEECH.vadModel.modelPath,
];

/** Loads explicitly requested local models and manages microphone or selected-recording sessions.
 * Uses experimental Fluid Speech Pro per speaker turn. Returns model controls, capture actions and text results.
 * Stop drains the microphone buffer; background, navigation, errors and Clear discard pending work.
 * Recording picker copies are deleted after sequential processing; returned actions never save captured PCM.
 */
export function useMeetingSession() {
  const model = useModelControls(MEETING_PATHS, {
    hasLocalAssets: true,
    name: 'Fluid Speech Pro · Nemotron 3',
  });
  const download = useResourceDownload(MEETING_CONFIG, {
    preventLoad: !model.loaded,
  });
  const loaded = useModel(createMeetingPipeline, download.resource);
  const pipeline = loaded.model;
  const [turns, setTurns] = useTaskState<TranscriptTurn[]>([], model.revision);
  const [error, setError] = useTaskState<string | null>(null, model.revision);
  const localModel = useImportedMeetingModels(
    model.revision,
    model.deleting,
    model.refreshCache,
    setError
  );
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recordingName, setRecordingName] = useTaskState<string | undefined>(
    undefined,
    model.revision
  );
  const queue = useRef(new PcmQueue(CHUNK_SAMPLES * 2));
  const active = useRef(false);
  const draining = useRef(false);
  const running = useRef(false);
  const generation = useRef(0);
  const elapsed = useRef(0);
  const mounted = useRef(true);
  const selectingRecording = useRef(false);

  const discard = useCallback(() => {
    generation.current++;
    active.current = false;
    draining.current = false;
    queue.current.clear();
    pipeline?.reset();
  }, [pipeline]);
  const captureStopped = () => {
    active.current = false;
    if (!draining.current && !selectingRecording.current) discard();
  };
  const recorder = useAudioRecorder(captureStopped, setError);
  const { stopRecording } = recorder;

  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'background' && !selectingRecording.current) {
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
          setTurns((previous) => appendTranscriptTurns(previous, results));
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
    if (!isDevice) {
      await importRecording();
      return;
    }
    if (recorder.isRecording) {
      draining.current = true;
      await recorder.stopRecording();
      void pump();
      return;
    }
    if (!pipeline || !model.prepared || processing || recorder.starting) return;
    discard();
    elapsed.current = 0;
    setRecordingName(undefined);
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
  const inBackground = () => AppState.currentState === 'background';
  const importRecording = async () => {
    if (
      !pipeline ||
      !model.prepared ||
      processing ||
      recorder.isRecording ||
      recorder.starting ||
      running.current
    )
      return;
    discard();
    const request = generation.current;
    running.current = true;
    setProcessing(true);
    setError(null);
    let temporary: string | undefined;
    let samples: Float32Array | undefined;
    try {
      selectingRecording.current = true;
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: false,
        copyToCacheDirectory: true,
      });
      selectingRecording.current = false;
      if (picked.canceled) return;
      const asset = picked.assets[0];
      temporary = decodeURIComponent(asset.uri.replace(/^file:\/\//, ''));
      if (request !== generation.current || !mounted.current) return;
      if (Number((await RNBlobUtil.fs.stat(temporary)).size) > 100_000_000)
        throw new Error('Choose a recording smaller than 100 MB and up to five minutes.');
      const buffer = await decodeAudioData(asset.uri, SAMPLE_RATE);
      if (buffer.duration > 300 || buffer.duration < 0.1 || buffer.sampleRate !== SAMPLE_RATE)
        throw new Error('Choose a recording between 0.1 seconds and five minutes.');
      samples = new Float32Array(buffer.length);
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const values = buffer.getChannelData(channel);
        for (let i = 0; i < samples.length; i++) samples[i] += values[i] / buffer.numberOfChannels;
      }
      if (request !== generation.current || !mounted.current || inBackground()) return;
      setTurns([]);
      setCopied(false);
      setRecordingName(asset.name);
      for (let start = 0; start < samples.length; start += CHUNK_SAMPLES) {
        if (request !== generation.current || !mounted.current || inBackground()) break;
        const crop = samples.slice(start, start + CHUNK_SAMPLES);
        if (crop.length < 1600) {
          crop.fill(0);
          break;
        }
        const results = await pipeline.process(crop, start / SAMPLE_RATE);
        if (request === generation.current && mounted.current)
          setTurns((previous) => appendTranscriptTurns(previous, results));
      }
    } catch (cause) {
      if (mounted.current && request === generation.current)
        setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      selectingRecording.current = false;
      samples?.fill(0);
      if (temporary?.startsWith(`${RNBlobUtil.fs.dirs.CacheDir}/`))
        await RNBlobUtil.fs.unlink(temporary).catch(() => {});
      pipeline.reset();
      running.current = false;
      if (mounted.current) setProcessing(false);
    }
  };
  const clear = () => {
    discard();
    void recorder.stopRecording();
    setTurns([]);
    setRecordingName(undefined);
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
    importRecording,
    recordingName,
    supportsMicrophone: isDevice,
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
