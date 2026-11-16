import { createFluidSpeechTranscriber, FLUID_SPEECH } from './fluidSpeech';
import { transcriptionSpans } from './speakerMemory';
import type { Model } from 'react-native-executorch';
import { disposeNemotron, inferNemotron, loadNemotron, NEMOTRON_PATH } from './nemotron';
import { emptyNemotronMemory } from './nemotronMemory';

export const MEETING_CONFIG = { diarizer: NEMOTRON_PATH, fluid: FLUID_SPEECH };
export type MeetingConfig = typeof MEETING_CONFIG;
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
        transcribe: (audio: Float32Array) => Promise<string>;
        transcribeStop: () => void;
        dispose: () => Promise<unknown>;
      }
    | undefined;
  try {
    diarizer = await loadNemotron(config.diarizer);
    asr = await createFluidSpeechTranscriber(config.fluid);
  } catch (cause) {
    if (diarizer) await disposeNemotron(diarizer);
    throw cause;
  }
  const model = diarizer;
  let memory = emptyNemotronMemory();
  let epoch = 0;
  let disposed = false;
  let pending: Promise<unknown> = Promise.resolve();
  let disposal: Promise<void> | undefined;
  const reset = () => {
    epoch++;
    memory.cache.fill(0);
    memory.fifo.fill(0);
    memory.cacheProbabilities.fill(0);
    memory = emptyNemotronMemory();
    asr?.transcribeStop();
  };
  return {
    reset,
    process(audio: Float32Array, offset: number): Promise<TranscriptTurn[]> {
      const request = epoch;
      const result = pending
        .then(async () => {
          if (disposed || request !== epoch) return [];
          const output = await inferNemotron(model, new Float32Array(audio), memory);
          if (disposed || request !== epoch) {
            output.memory.cache.fill(0);
            output.memory.fifo.fill(0);
            output.memory.cacheProbabilities.fill(0);
            return [];
          }
          memory.cache.fill(0);
          memory.fifo.fill(0);
          memory.cacheProbabilities.fill(0);
          memory = output.memory;
          const turns: TranscriptTurn[] = [];
          for (const span of transcriptionSpans(output.spans)) {
            if (disposed || request !== epoch) return [];
            // VAD can recover speech below the diarization threshold as unassigned.
            if (span.end - span.start < 0.32) continue;
            let text: string | undefined;
            if (asr) {
              const crop = audio.slice(Math.floor(span.start * 16000), Math.ceil(span.end * 16000));
              try {
                text = (await asr.transcribe(crop)).trim();
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
      if (disposal) return disposal;
      disposed = true;
      reset();
      disposal = pending.then(async () => {
        try {
          await asr?.dispose();
        } finally {
          await disposeNemotron(model);
        }
      });
      return disposal;
    },
  };
}
