import { createFluidSpeechTranscriber, FLUID_SPEECH } from './fluidSpeech';
import { assignWordSpeakers, type TimedWord } from './wordSpeakers';
import type { Model } from 'react-native-executorch';
import { disposeNemotron, inferNemotron, loadNemotron, NEMOTRON_PATH } from './nemotron';
import { emptyNemotronMemory } from './nemotronMemory';
import { bridgeSpeakerGaps } from './speakerMemory';

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
        transcribeWords: (audio: Float32Array) => Promise<TimedWord[]>;
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
          // ASR sees the complete chunk, independent of speaker switches/uncertainty.
          const words = await asr!.transcribeWords(audio);
          const turns = assignWordSpeakers(words, bridgeSpeakerGaps(output.spans), offset);
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
