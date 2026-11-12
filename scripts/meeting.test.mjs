import {
  advanceNemotronMemory,
  emptyNemotronMemory,
} from '../src/lib/diarization/nemotronMemory.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PcmQueue } from '../src/lib/diarization/pcmQueue.ts';
import { speakerSpans, transcriptionSpans } from '../src/lib/diarization/speakerMemory.ts';

test('PCM queue spans callbacks, erases consumed source buffers and clears pending audio', () => {
  const queue = new PcmQueue(8);
  const a = new Float32Array([1, 2, 3]);
  const b = new Float32Array([4, 5, 6]);
  queue.push(a);
  queue.push(b);
  assert.deepEqual([...queue.take(4)], [1, 2, 3, 4]);
  assert.ok(a.every((x) => x === 0));
  assert.ok(b.every((x) => x === 0));
  assert.equal(queue.length, 2);
  assert.deepEqual([...queue.take(2)], [5, 6]);
  queue.push(new Float32Array([7, 8]));
  queue.clear();
  assert.equal(queue.length, 0);
});
test('PCM queue bounds backlog and erases rejected input', () => {
  const queue = new PcmQueue(2);
  const samples = new Float32Array([1, 2, 3]);
  assert.throws(() => queue.push(samples), /fell behind/);
  assert.ok(samples.every((x) => x === 0));
  assert.equal(queue.length, 0);
});
test('speaker spans preserve overlapping voices, uncertainty, and last partial frame', () => {
  const spans = speakerSpans(
    new Float32Array([0.8, 0.1, 0, 0, 0.9, 0.2, 0, 0, 0.6, 0.7, 0, 0, 0.1, 0.1, 0, 0]),
    0.3,
    4,
    0.08
  );
  assert.deepEqual(
    spans.map((x) => x.speakers),
    [[1], [1, 2], []]
  );
  assert.equal(spans[0].end, 0.16);
  assert.equal(spans[2].end, 0.3);
});
test('ASR crops retain continuous voices across brief overlaps, preserving switches and uncertainty', () => {
  const merged = transcriptionSpans([
    { start: 0, end: 1, speakers: [1] },
    { start: 1, end: 1.3, speakers: [1, 2] },
    { start: 1.3, end: 3, speakers: [1] },
    { start: 3, end: 4, speakers: [2] },
    { start: 4, end: 5, speakers: [] },
    { start: 5, end: 6, speakers: [2] },
  ]);
  assert.equal(merged.length, 4);
  assert.deepEqual(merged[0], { start: 0, end: 3, speakers: [1], overlap: true });
  assert.deepEqual(merged[1].speakers, [2]);
  assert.deepEqual(merged[2].speakers, []);
});

test('eight-speaker frame decoding preserves channels above four and 10ms timing', () => {
  const probabilities = new Float32Array(24);
  probabilities[6] = 0.9;
  probabilities[15] = 0.8;
  probabilities[21] = 0.9;
  const spans = speakerSpans(probabilities, 0.025, 8, 0.01);
  assert.deepEqual(
    spans.map((span) => span.speakers),
    [[7], [8], [6]]
  );
  assert.equal(spans[1].start, 0.01);
  assert.equal(spans[2].end, 0.025);
});

function frameEmbeddings(count, first = 0) {
  const values = new Float32Array(count * 512);
  for (let i = 0; i < count; i++) values.fill(first + i, i * 512, (i + 1) * 512);
  return values;
}
test('Nemotron FIFO overflow moves the source policy update period, not just excess frames', () => {
  let memory = emptyNemotronMemory();
  for (let batch = 0; batch < 3; batch++) {
    const total = memory.cache.length / 512 + memory.fifo.length / 512 + 126;
    const next = advanceNemotronMemory(
      memory,
      frameEmbeddings(126, batch * 126),
      new Float32Array(total * 8)
    );
    assert.equal(next.needsCompression, false);
    memory = next.memory;
  }
  assert.equal(memory.cache.length / 512, 222);
  assert.equal(memory.fifo.length / 512, 156);
  assert.equal(memory.cache[0], 0);
  assert.equal(memory.cache[221 * 512], 221);
  assert.equal(memory.fifo[0], 222);
  assert.equal(memory.fifo[155 * 512], 377);
});
test('Nemotron retains compressed cache scores but re-estimates chronological cache scores', () => {
  for (const compressed of [false, true]) {
    const cacheFrames = compressed ? 264 : 222;
    const memory = {
      cache: frameEmbeddings(cacheFrames),
      cacheProbabilities: new Float32Array(cacheFrames * 8).fill(0.1),
      fifo: frameEmbeddings(252, 1000),
      compressed,
    };
    const pooled = new Float32Array((cacheFrames + 252 + 13) * 8).fill(0.9);
    const next = advanceNemotronMemory(memory, frameEmbeddings(13, 1252), pooled);
    assert.equal(next.needsCompression, true);
    assert.equal(next.memory.cacheProbabilities[0], new Float32Array([compressed ? 0.1 : 0.9])[0]);
    assert.equal(next.memory.cacheProbabilities[cacheFrames * 8], new Float32Array([0.9])[0]);
    assert.equal(memory.cacheProbabilities[0], new Float32Array([0.1])[0]);
  }
});
