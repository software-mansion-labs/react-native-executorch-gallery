import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PcmQueue } from '../src/lib/diarization/pcmQueue.ts';
import {
  compressCache,
  speakerSpans,
  transcriptionSpans,
} from '../src/lib/diarization/speakerMemory.ts';

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
    0.3
  );
  assert.deepEqual(
    spans.map((x) => x.speakers),
    [[1], [1, 2], []]
  );
  assert.equal(spans[0].end, 0.16);
  assert.equal(spans[2].end, 0.3);
});
test('cache selects informative frames then restores chronology with a strict memory bound', () => {
  const embeddings = new Float32Array(200 * 512);
  const scores = new Float32Array(200 * 4);
  for (let i = 0; i < 200; i++) {
    embeddings.fill(i, i * 512, (i + 1) * 512);
    scores[i * 4] = i / 200;
  }
  const cache = compressCache(embeddings, scores);
  assert.equal(cache.length, 188 * 512);
  assert.equal(cache[0], 12);
  assert.equal(cache[cache.length - 1], 199);
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
