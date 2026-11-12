import { createLfmAudioTranscriber, LFM_AUDIO, type LfmAudioConfig } from './lfmAudio';
import { emptySpeakerMemory, transcriptionSpans } from './speakerMemory';
import { createWhisperSpeechToText, models, type Model } from 'react-native-executorch';
import { disposeSortformer, inferSpeakers, loadSortformer, SORTFORMER_URL } from './sortformer';

export const WHISPER = models.speechToText.WHISPER.EN.TINY.XNNPACK_INT8;
export const DIARIZATION_CONFIG = { diarizer: SORTFORMER_URL };
export const MEETING_CONFIG = { diarizer: SORTFORMER_URL, lfm: LFM_AUDIO };
export type MeetingConfig = { diarizer: string; whisper?: typeof WHISPER; lfm?: LfmAudioConfig };
export type TranscriptTurn = {
  start: number;
  end: number;
  speakers: number[];
  text?: string;
  overlap?: boolean;
};

/** Serializes inference and releases the native models only after the active operation finishes. */
export async function createMeetingPipeline(config: MeetingConfig) {
  let diarizer: Model | undefined;
  let asr:
    | {
        transcribe: (audio: Float32Array, options: { language: 'en' }) => Promise<string>;
        transcribeStop: () => void;
        dispose: () => void;
      }
    | undefined;
  try {
    diarizer = await loadSortformer(config.diarizer);
    if (config.lfm) asr = await createLfmAudioTranscriber(config.lfm);
    else if (config.whisper) asr = await createWhisperSpeechToText(config.whisper);
  } catch (cause) {
    if (diarizer) await disposeSortformer(diarizer);
    throw cause;
  }
  const model = diarizer;
  let memory = emptySpeakerMemory();
  let epoch = 0;
  let disposed = false;
  let pending: Promise<unknown> = Promise.resolve();
  const reset = () => {
    epoch++;
    memory.cache.fill(0);
    memory.fifo.fill(0);
    memory = emptySpeakerMemory();
    asr?.transcribeStop();
  };
  return {
    reset,
    process(audio: Float32Array, offset: number): Promise<TranscriptTurn[]> {
      const request = epoch;
      const result = pending
        .then(async () => {
          if (disposed || request !== epoch) return [];
          const output = await inferSpeakers(model, new Float32Array(audio), memory);
          if (disposed || request !== epoch) {
            output.memory.cache.fill(0);
            output.memory.fifo.fill(0);
            return [];
          }
          memory.cache.fill(0);
          memory.fifo.fill(0);
          memory = output.memory;
          const turns: TranscriptTurn[] = [];
          for (const span of asr ? transcriptionSpans(output.spans) : output.spans) {
            if (disposed || request !== epoch) return [];
            // VAD can recover speech below the diarization threshold as unassigned.
            if ((!asr && !span.speakers.length) || span.end - span.start < 0.32) continue;
            let text: string | undefined;
            if (asr) {
              const crop = audio.slice(Math.floor(span.start * 16000), Math.ceil(span.end * 16000));
              try {
                text = (await asr.transcribe(crop, { language: 'en' })).trim();
              } finally {
                crop.fill(0);
              }
              if (!text) continue;
            }
            turns.push({
              start: offset + span.start,
              end: offset + span.end,
              speakers: span.speakers,
              text,
              overlap: 'overlap' in span ? span.overlap === true : undefined,
            });
          }
          return disposed || request !== epoch ? [] : turns;
        })
        .finally(() => audio.fill(0));
      pending = result.catch(() => {});
      return result;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      reset();
      void pending.finally(async () => {
        asr?.dispose();
        await disposeSortformer(model);
      });
    },
  };
}
