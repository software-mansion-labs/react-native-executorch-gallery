import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(
  readFileSync(new URL('../src/lib/omni/playback.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText;

async function harness() {
  let wall = 0;
  let audio = 0;
  let sequence = 0;
  let ended = 0;
  let stopped = 0;
  const timers = new Map();
  const buffers = [];
  const playing = [];
  const source = {
    connect() {},
    enqueueBuffer(buffer) {
      const id = String(buffers.length);
      buffers.push({ id, length: buffer.length });
      return id;
    },
    start() {},
    stop() {
      stopped++;
    },
    clearBuffers() {},
  };
  class AudioContext {
    get currentTime() {
      return audio;
    }
    async resume() {}
    async close() {}
    createBufferQueueSource() {
      return source;
    }
    createBuffer(_channels, length) {
      return { length, copyToChannel() {} };
    }
  }
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require(name) {
      assert.equal(name, 'react-native-audio-api');
      return { AudioContext };
    },
    Float32Array,
    __DEV__: false,
    performance: { now: () => wall * 1000 },
    setTimeout(fn, ms) {
      const id = ++sequence;
      timers.set(id, { fn, at: wall + ms / 1000 });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  const player = await module.exports.createOmniPlayback({
    onPlaying: (value) => playing.push(value),
    onLevel() {},
    onEnd: () => ended++,
  });
  return {
    player,
    source,
    buffers,
    playing,
    get ended() {
      return ended;
    },
    get stopped() {
      return stopped;
    },
    get pendingTimers() {
      return timers.size;
    },
    advance(seconds, suspended = false) {
      const target = wall + seconds;
      let iterations = 0;
      while (timers.size) {
        const [id, timer] = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (timer.at > target + 1e-9) break;
        assert.ok(++iterations < 1000, 'completion timer must not spin');
        const next = Math.max(wall + 1e-9, timer.at);
        if (!suspended) audio += next - wall;
        wall = next;
        timers.delete(id);
        timer.fn();
      }
      if (!suspended) audio += Math.max(0, target - wall);
      wall = Math.max(wall, target);
    },
  };
}

const pcm = (seconds) => new Float32Array(Math.round(seconds * 24000));

test('final audio drains before completion when the final native event is missing', async () => {
  const h = await harness();
  h.player.enqueue(pcm(2), false);
  h.advance(0.5);
  h.player.enqueue(new Float32Array(), true);
  h.advance(1.4);
  assert.equal(h.ended, 0, 'must not truncate queued speech when generation ends');
  h.advance(0.4);
  assert.equal(h.ended, 1);
  assert.equal(h.player.getStats().closed, true);
  assert.equal(h.playing.at(-1), false);
});

test('wall time during a suspended context does not truncate speech', async () => {
  const h = await harness();
  h.player.enqueue(pcm(1), true);
  h.advance(10, true);
  assert.equal(h.ended, 0);
  h.advance(1.3);
  assert.equal(h.ended, 1);
});

test('native completion closes once and cancels the fallback timer', async () => {
  const h = await harness();
  h.player.enqueue(pcm(0.1), true);
  const callback = h.source.onbufferended;
  callback({ bufferId: h.buffers[0].id });
  callback({ bufferId: h.buffers[0].id });
  h.advance(5);
  assert.equal(h.ended, 1);
  assert.equal(h.stopped, 1);
  assert.equal(h.pendingTimers, 0);
});

test('a final marker after an underrun completes without starting a silent stream', async () => {
  const h = await harness();
  h.player.enqueue(pcm(1), false);
  h.source.onbufferended({ bufferId: h.buffers[0].id });
  assert.equal(h.ended, 0);
  h.player.enqueue(new Float32Array(), true);
  assert.equal(h.ended, 1);
  assert.equal(h.player.getStats().playing, false);
});

test('stopping cancels completion and never ends a replacement playback', async () => {
  const h = await harness();
  h.player.enqueue(pcm(1), true);
  h.player.stop();
  h.advance(10);
  assert.equal(h.ended, 0);
  assert.equal(h.pendingTimers, 0);
});

test('refill time extends the drain deadline without truncating the final buffered tail', async () => {
  const h = await harness();
  h.player.enqueue(pcm(1), false);
  h.advance(1);
  h.source.onbufferended({ bufferId: h.buffers[0].id });
  h.advance(4);
  h.player.enqueue(pcm(3), true);
  h.advance(2.9);
  assert.equal(h.ended, 0);
  h.advance(0.4);
  assert.equal(h.ended, 1);
});
