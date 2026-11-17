import {
  createResourceScope,
  loadModel,
  models,
  schema,
  tensor,
  wrapAsync,
} from 'react-native-executorch';
import { createImagePreprocessor, type ImageBuffer } from 'react-native-executorch/cv';

export const RAIN_MODEL = models.instanceSegmentation.YOLO26.NANO.SIZE_384.XNNPACK_INT8;

export type PersonMask = { data: number[]; width: number; height: number; people: number };

/** Loads the published segmentation PTE through the existing low-level API. */
async function createRunner(config: typeof RAIN_MODEL) {
  const scope = createResourceScope();
  try {
    const model = scope.track(await wrapAsync(loadModel)(config.modelPath));
    const { dims, variant } = schema.validateSpec(model.schema, {
      batched: schema.method(
        'forward',
        [schema.f32(1, 3, 'H', 'W')],
        [schema.f32('N', 4), schema.f32('N'), schema.f32('N'), schema.f32('N', 'MH', 'MW')]
      ),
      unbatched: schema.method(
        'forward',
        [schema.f32(3, 'H', 'W')],
        [schema.f32('N', 4), schema.f32('N'), schema.f32('N'), schema.f32('N', 'MH', 'MW')]
      ),
    });
    const [n, h, w, mh, mw] = dims.constant('N', 'H', 'W', 'MH', 'MW');
    const preprocessor = scope.track(
      createImagePreprocessor(config.modelOpts, variant === 'batched' ? [1, 3, h, w] : [3, h, w])
    );
    const boxes = scope.track(tensor('float32', [n, 4]));
    const scores = scope.track(tensor('float32', [n]));
    const classes = scope.track(tensor('float32', [n]));
    const masks = scope.track(tensor('float32', [n, mh, mw]));
    const selected = scope.track(tensor('float32', [mh, mw]));
    const run = (image: ImageBuffer): PersonMask => {
      'worklet';
      model.execute('forward', [preprocessor.process(image)], [boxes, scores, classes, masks]);
      const confidence = scores.getData(new Float32Array(n));
      const labels = classes.getData(new Float32Array(n));
      const bounds = boxes.getData(new Float32Array(n * 4));
      const union = new Array<number>(mh * mw).fill(0);
      let people = 0;
      // Union confident person instances. Duplicate detections cannot add occupancy.
      // Restrict each logit mask to its own model-space box, as the task pipeline does.
      for (let i = 0; i < n; i++) {
        if (confidence[i]! < 0.4 || Math.round(labels[i]!) !== 0) continue;
        const logits = masks
          .copyTo(selected, { offset: i * mh * mw, length: mh * mw })
          .getData(new Float32Array(mh * mw));
        let occupied = false;
        for (let y = 0; y < mh; y++) {
          for (let x = 0; x < mw; x++) {
            const px = ((x + 0.5) * w) / mw;
            const py = ((y + 0.5) * h) / mh;
            const index = y * mw + x;
            if (
              px >= bounds[i * 4]! &&
              px <= bounds[i * 4 + 2]! &&
              py >= bounds[i * 4 + 1]! &&
              py <= bounds[i * 4 + 3]! &&
              logits[index]! > 0
            ) {
              union[index] = 1;
              occupied = true;
            }
          }
        }
        if (occupied) people++;
      }
      return { data: union, width: mw, height: mh, people };
    };
    return { run, dispose: scope.dispose };
  } catch (error) {
    scope.dispose();
    throw error;
  }
}

/** Runs inference off-thread and defers teardown until the pending call settles. */
export async function createRainSegmenter(config: typeof RAIN_MODEL) {
  const runner = await createRunner(config);
  const runAsync = wrapAsync(runner.run);
  let disposed = false;
  let pending: Promise<PersonMask> | undefined;
  return {
    run: (image: ImageBuffer) => {
      if (disposed) return Promise.reject(new Error('Segmentation session was disposed.'));
      if (pending) return Promise.reject(new Error('Segmentation is already running.'));
      const result = runAsync(image);
      pending = result;
      void result.then(
        () => {
          pending = undefined;
        },
        () => {
          pending = undefined;
        }
      );
      return result;
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      if (pending) void pending.then(runner.dispose, runner.dispose);
      else runner.dispose();
    },
  };
}
