/** Bounded transient PCM queue. Overflow stops capture instead of silently losing speech. */
export class PcmQueue {
  private chunks: Float32Array[] = [];
  private size = 0;
  private capacity: number;
  constructor(capacity: number) {
    this.capacity = capacity;
  }
  get length() {
    return this.size;
  }
  push(samples: Float32Array) {
    if (this.size + samples.length > this.capacity) {
      samples.fill(0);
      throw new Error(
        'Processing fell behind. Capture stopped; queued audio was discarded. Try a shorter session.'
      );
    }
    this.chunks.push(samples);
    this.size += samples.length;
  }
  take(count: number) {
    if (count > this.size) throw new Error('Not enough buffered audio');
    const output = new Float32Array(count);
    let written = 0;
    while (written < count) {
      const first = this.chunks[0];
      const n = Math.min(first.length, count - written);
      output.set(first.subarray(0, n), written);
      const remainder = first.slice(n);
      first.fill(0);
      this.chunks.shift();
      if (remainder.length) this.chunks.unshift(remainder);
      written += n;
      this.size -= n;
    }
    return output;
  }
  clear() {
    for (const chunk of this.chunks) chunk.fill(0);
    this.chunks = [];
    this.size = 0;
  }
}
