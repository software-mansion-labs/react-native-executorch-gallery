import {
  createResourceScope,
  loadModel,
  models,
  schema,
  tensor,
  wrapAsync,
} from 'react-native-executorch';
import { createImagePreprocessor, type ImageBuffer } from 'react-native-executorch/cv';

export const RAIN_MODEL = models.semanticSegmentation.SELFIE_SEGMENTATION.DEFAULT;
// Portrait camera frames retain their field of view at a 256px long edge.
// The model's configured native preprocessor performs the final 256x256 stretch.
export const RAIN_INPUT_SIZE = { width: 144, height: 256 };
type SegmenterConfig = typeof RAIN_MODEL;

export type PersonMask = { data: Uint8Array; width: number; height: number; people: number };

/** Direct logit mask pipeline; avoids resizing a full RGBA mask back to the camera resolution. */
export async function createRainSegmenter(config: SegmenterConfig) {
  const scope = createResourceScope();
  try {
    const model = scope.track(await wrapAsync(loadModel)(config.modelPath));
    const { dims, variant } = schema.validateSpec(model.schema, {
      batched: schema.method(
        'forward',
        [schema.f32(1, 3, 'H', 'W')],
        [schema.f32(1, 'K', 'OH', 'OW')]
      ),
      unbatched: schema.method('forward', [schema.f32(3, 'H', 'W')], [schema.f32('K', 'OH', 'OW')]),
    });
    const [h, w, k, oh, ow] = dims.constant('H', 'W', 'K', 'OH', 'OW');
    if (k !== 1 && k !== 2) throw new Error('Expected a binary foreground segmentation model.');
    const preprocessor = scope.track(
      createImagePreprocessor(config.modelOpts, variant === 'batched' ? [1, 3, h, w] : [3, h, w])
    );
    const output = scope.track(
      tensor('float32', variant === 'batched' ? [1, k, oh, ow] : [k, oh, ow])
    );
    const run = (image: ImageBuffer): PersonMask & { inferenceMs: number } => {
      'worklet';
      const input = preprocessor.process(image);
      const started = performance.now();
      model.execute('forward', [input], [output]);
      const inferenceMs = performance.now() - started;
      const logits = output.getData(new Float32Array(k * oh * ow));
      const size = 96;
      const data = new Uint8Array(size * size);
      let occupied = 0;
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const index =
            Math.min(oh - 1, Math.floor(((y + 0.5) * oh) / size)) * ow +
            Math.min(ow - 1, Math.floor(((x + 0.5) * ow) / size));
          const foreground =
            k === 1 ? logits[index]! > 0 : logits[oh * ow + index]! > logits[index]!;
          data[y * size + x] = foreground ? 1 : 0;
          if (foreground) occupied++;
        }
      return { data, width: size, height: size, people: occupied > 0 ? 1 : 0, inferenceMs };
    };
    return { segmentWorklet: run, dispose: scope.dispose };
  } catch (error) {
    scope.dispose();
    throw error;
  }
}
