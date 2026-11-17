import { Skia } from '@shopify/react-native-skia';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { createVideoPlayer } from 'expo-video';
import RNBlobUtil from 'react-native-blob-util';

import { skImageToBuffer } from '@/lib/image';

/**
 * Samples CPU-readable frames through Expo's native thumbnail API. The simulator's
 * Skia video-texture readback produced black pixels, so this PoC uses encoded
 * native image frames instead. Temporary PNGs and native image refs are released.
 */
export async function createClipSampler(uri: string, inputSize = 384) {
  const player = createVideoPlayer(null);
  let pending: Promise<unknown> | undefined;
  let disposed = false;
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        subscription.remove();
        if (error) reject(error);
        else resolve();
      };
      const subscription = player.addListener('statusChange', ({ status, error }) => {
        if (status === 'readyToPlay') finish();
        else if (status === 'error')
          finish(new Error(error?.message || 'Could not open this clip.'));
      });
      const timeout = setTimeout(
        () => finish(new Error('This clip took too long to open.')),
        20_000
      );
      void player.replaceAsync(uri).catch((error: unknown) => finish(new Error(String(error))));
    });
    player.muted = true;
    player.loop = true;
    const sampleFrame = async (seconds: number) => {
      const thumbnails = await player.generateThumbnailsAsync(seconds, {
        maxWidth: inputSize,
        maxHeight: inputSize,
      });
      const thumbnail = thumbnails[0];
      if (!thumbnail) throw new Error('Could not decode a video frame.');
      const context = ImageManipulator.manipulate(thumbnail);
      let temporaryFile: string | undefined;
      try {
        const nativeImage = await context.renderAsync();
        try {
          temporaryFile = (await nativeImage.saveAsync({ format: SaveFormat.PNG })).uri;
          const data = await Skia.Data.fromURI(temporaryFile);
          const image = Skia.Image.MakeImageFromEncoded(data);
          if (!image) throw new Error('Could not read the decoded frame.');
          try {
            return {
              image,
              input: skImageToBuffer(image),
              sourceSeconds: Number.isFinite(thumbnail.actualTime) ? thumbnail.actualTime : seconds,
              requestedSeconds: seconds,
            };
          } catch (error) {
            image.dispose();
            throw error;
          }
        } finally {
          nativeImage.release();
        }
      } finally {
        context.release();
        thumbnails.forEach((item) => item.release());
        if (temporaryFile)
          await RNBlobUtil.fs.unlink(temporaryFile.replace('file://', '')).catch(() => {});
      }
    };
    return {
      player,
      play: () => player.play(),
      pause: () => player.pause(),
      sample: (seconds = player.currentTime) => {
        if (disposed || pending) return Promise.reject(new Error('Clip sampler is unavailable.'));
        const result = sampleFrame(seconds);
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
        player.pause();
        if (pending)
          void pending.then(
            () => player.release(),
            () => player.release()
          );
        else player.release();
      },
    };
  } catch (error) {
    player.release();
    throw error;
  }
}
