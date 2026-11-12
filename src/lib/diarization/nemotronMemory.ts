/** Bounded streaming state following HF Transformers 5.20 Nemotron3DiarizationSpeakerCache. */
export type NemotronMemory = {
  cache: Float32Array;
  cacheProbabilities: Float32Array;
  fifo: Float32Array;
  compressed: boolean;
};
export const emptyNemotronMemory = (): NemotronMemory => ({
  cache: new Float32Array(0),
  cacheProbabilities: new Float32Array(0),
  fifo: new Float32Array(0),
  compressed: false,
});

/** Advances FIFO/cache ownership. The exported compression method handles frame ranking separately. */
export function advanceNemotronMemory(
  memory: NemotronMemory,
  chunk: Float32Array,
  pooled: Float32Array
) {
  'worklet';
  const width = 512;
  const speakers = 8;
  const cacheFrames = memory.cache.length / width;
  const fifoAndChunk = new Float32Array(memory.fifo.length + chunk.length);
  fifoAndChunk.set(memory.fifo);
  fifoAndChunk.set(chunk, memory.fifo.length);
  const fifoFrames = fifoAndChunk.length / width;
  const popped = fifoFrames <= 264 ? 0 : Math.min(Math.max(222, fifoFrames - 264), fifoFrames);
  let cache = new Float32Array(memory.cache);
  let cacheProbabilities = new Float32Array(memory.cacheProbabilities);
  if (popped) {
    cache = new Float32Array((cacheFrames + popped) * width);
    cache.set(memory.cache);
    cache.set(fifoAndChunk.subarray(0, popped * width), memory.cache.length);
    cacheProbabilities = new Float32Array((cacheFrames + popped) * speakers);
    cacheProbabilities.set(
      memory.compressed ? memory.cacheProbabilities : pooled.subarray(0, cacheFrames * speakers)
    );
    cacheProbabilities.set(
      pooled.subarray(cacheFrames * speakers, (cacheFrames + popped) * speakers),
      cacheFrames * speakers
    );
  }
  return {
    memory: {
      cache,
      cacheProbabilities,
      fifo: fifoAndChunk.slice(popped * width),
      compressed: memory.compressed,
    },
    needsCompression: cache.length / width > 264,
  };
}
