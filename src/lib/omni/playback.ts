import { AudioContext } from 'react-native-audio-api';

const SAMPLE_RATE = 24000;
const START_BUFFER_SECONDS = 1;
const REFILL_BUFFER_SECONDS = 6;

/** Favor early audio when generation keeps up; buffer more when its measured cadence falls behind. */
export async function createOmniPlayback(callbacks: {
  onPlaying: (playing: boolean) => void;
  onLevel: (level: number) => void;
  onEnd: () => void;
}) {
  const context = new AudioContext({ sampleRate: SAMPLE_RATE });
  try {
    await context.resume();
  } catch (error) {
    await context.close().catch(() => {});
    throw error;
  }
  const source = context.createBufferQueueSource();
  source.connect(context.destination);
  const chunks: { id?: string; offset: number; audio: Float32Array }[] = [];
  let enqueuedChunks = 0;
  let samples = 0;
  let consumed = 0;
  let playing = false;
  let closed = false;
  let final = false;
  let starts = 0;
  let underruns = 0;
  let firstStartMs: number | null = null;
  let firstChunkAt = 0;
  let firstChunkSamples = 0;
  let generationRtf = 1;
  let queuedEndTime = 0;
  let endTimer: ReturnType<typeof setTimeout> | undefined;
  const created = performance.now();
  const finish = () => {
    if (closed) return;
    closed = true;
    if (endTimer !== undefined) clearTimeout(endTimer);
    endTimer = undefined;
    playing = false;
    source.onbufferended = null;
    source.onpositionchanged = null;
    source.stop();
    source.clearBuffers();
    void context.close().catch(() => {});
    callbacks.onPlaying(false);
    callbacks.onLevel(0);
  };
  const complete = () => {
    if (closed) return;
    finish();
    callbacks.onEnd();
  };
  const waitForDrain = () => {
    if (closed || !final || !starts || endTimer !== undefined) return;
    // The native queue stays alive when empty. A missed final buffer event must
    // not leave it producing silence forever. Use audio-context time so a
    // suspended context cannot cause a wall-clock timeout to cut off speech.
    const remaining = queuedEndTime + 0.2 - context.currentTime;
    if (remaining <= 0) {
      if (__DEV__) console.info('[Omni] Closing drained speech queue after missing end event.');
      complete();
      return;
    }
    endTimer = setTimeout(
      () => {
        endTimer = undefined;
        waitForDrain();
      },
      Math.min(remaining * 1000, 250)
    );
  };
  source.onbufferended = ({ bufferId }) => {
    if (closed) return;
    const chunk = chunks.find((c) => c.id === bufferId);
    if (!chunk) return;
    consumed = Math.max(consumed, chunk.offset + chunk.audio.length);
    if (consumed === samples) {
      if (final) {
        complete();
      } else {
        underruns++;
        if (__DEV__)
          console.info('[Omni] Speech buffer underrun:', {
            playedSeconds: consumed / SAMPLE_RATE,
            waitMs: Math.round(performance.now() - created),
            underruns,
          });
        // Leave the native queue running and empty. Hold incoming PCM below
        // the refill threshold instead of pausing/restarting the source.
        playing = false;
        callbacks.onPlaying(false);
        callbacks.onLevel(0);
      }
    }
  };
  source.onpositionchangedInterval = 50;
  source.onpositionchanged = ({ value }) => {
    if (closed || !playing) return;
    const sample = Math.floor(value * SAMPLE_RATE);
    const chunk = chunks.find((c) => sample >= c.offset && sample < c.offset + c.audio.length);
    let energy = 0;
    let count = 0;
    if (chunk) {
      const start = sample - chunk.offset;
      const end = Math.min(chunk.audio.length, start + 1024);
      for (let i = start; i < end; i++) energy += chunk.audio[i] * chunk.audio[i];
      count = end - start;
    }
    callbacks.onLevel(Math.sqrt(energy / Math.max(1, count)));
  };
  return {
    enqueue(audio: Float32Array, isFinal: boolean) {
      if (closed || final) return;
      if (audio.length) {
        const now = performance.now();
        if (!samples) {
          firstChunkAt = now;
          firstChunkSamples = audio.length;
        } else {
          // Exclude model preparation/prefill and the first codec call. Measure
          // incoming speech including the gaps between text/audio blocks.
          generationRtf =
            (now - firstChunkAt) /
            (((samples + audio.length - firstChunkSamples) / SAMPLE_RATE) * 1000);
        }
        chunks.push({ offset: samples, audio });
        samples += audio.length;
      }
      final ||= isFinal;
      const queuedSeconds = (samples - consumed) / SAMPLE_RATE;
      const targetSeconds = starts
        ? REFILL_BUFFER_SECONDS
        : Math.min(
            REFILL_BUFFER_SECONDS,
            START_BUFFER_SECONDS + Math.max(0, generationRtf - 1) * 12
          );
      const ready = samples > consumed && (playing || final || queuedSeconds >= targetSeconds);
      if (ready) {
        while (enqueuedChunks < chunks.length) {
          const chunk = chunks[enqueuedChunks++];
          const buffer = context.createBuffer(1, chunk.audio.length, SAMPLE_RATE);
          buffer.copyToChannel(new Float32Array(chunk.audio), 0);
          chunk.id = source.enqueueBuffer(buffer);
          queuedEndTime =
            Math.max(queuedEndTime, context.currentTime) + chunk.audio.length / SAMPLE_RATE;
        }
      }
      if (!playing && ready) {
        if (!starts) {
          queuedEndTime = Math.max(queuedEndTime, context.currentTime + samples / SAMPLE_RATE);
          source.start(0, 0);
        }
        playing = true;
        starts++;
        firstStartMs ??= performance.now() - created;
        if (__DEV__)
          console.info('[Omni] Speech playback starts:', {
            waitMs: Math.round(performance.now() - created),
            queuedSeconds: (samples - consumed) / SAMPLE_RATE,
            targetSeconds,
            generationRtf,
            underruns,
          });
        callbacks.onPlaying(true);
      }
      if (final && consumed === samples) complete();
      else waitForDrain();
    },
    stop: finish,
    getStats: () => ({
      starts,
      underruns,
      firstStartMs,
      generationRtf,
      samples,
      consumed,
      closed,
      final,
      playing,
    }),
  };
}
