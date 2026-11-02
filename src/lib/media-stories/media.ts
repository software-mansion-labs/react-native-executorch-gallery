import { Image as NativeImage } from 'react-native';
import { Skia } from '@shopify/react-native-skia';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { createVideoPlayer } from 'expo-video';
import RNBlobUtil from 'react-native-blob-util';
import type { ChatMessageContent } from 'react-native-executorch/llm';
import type { ImageBuffer } from 'react-native-executorch/cv';

import { skImageToBuffer } from '@/lib/image';

export type MediaItem = {
  id: string;
  uri: string;
  preview: string;
  name: string;
  kind: 'photo' | 'video';
  duration: number;
  phase: 'queued' | 'reading' | 'describing' | 'done' | 'error';
  description: string;
  error?: string;
  latency?: number;
  temporaryPreview?: boolean;
  framesRead?: number;
  frameCount?: number;
  frameTime?: number;
};

export type MediaFrame = { image: ImageBuffer; seconds: number };
export const COLLECTION_LIMIT = 8;
export const FRAME_COUNT = 4;
export type FrameProgress = (completed: number, total: number, seconds: number) => void;
const MAX_CLIP_SECONDS = 60;

export const MEDIA_MESSAGES = [
  {
    role: 'system',
    content:
      'Describe the supplied images as one scene, not a frame-by-frame list. Return one JSON object only: {"description":"One or two short sentences, at most 40 words.","moments":[{"time":"0:00","text":"A short visible observation."}]}. For a clip, include at most two moments using the supplied timestamps. For a photo, use an empty moments array. Stay factual: never invent people, actions, sounds, or locations.',
  },
] as const;

/** Short local clips make the collection demo work without photo-library access. */
export function sampleMedia(): MediaItem[] {
  const clips = [
    {
      id: 'bloom',
      name: 'A flower opens',
      duration: 5.05,
      video: require('../../../assets/media-stories/bloom.mp4'),
      poster: require('../../../assets/media-stories/bloom.jpg'),
    },
  ];
  return clips.map((clip) => ({
    id: clip.id,
    name: clip.name,
    uri: NativeImage.resolveAssetSource(clip.video).uri,
    preview: NativeImage.resolveAssetSource(clip.poster).uri,
    kind: 'video',
    duration: clip.duration,
    phase: 'queued',
    description: '',
    frameCount: FRAME_COUNT,
  }));
}

/** Splits the streamed description and optional timestamped observations for presentation. */
export function mediaStorySections(text: string): {
  summary: string;
  moments: { time: string; text: string }[];
} {
  const description = text.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/);
  let summary = '';
  if (description) {
    try {
      summary = JSON.parse(`"${description[1]}"`);
    } catch {
      /* A partial escaped character will be complete on a later token. */
    }
  } else if (!text.includes('{') && !text.trimStart().startsWith('`')) {
    summary = text.trim();
  }
  const moments = (
    text.match(/\{\s*"time"\s*:\s*"(?:[^"\\]|\\.)*"\s*,\s*"text"\s*:\s*"(?:[^"\\]|\\.)*"\s*\}/g) ??
    []
  ).flatMap((source) => {
    try {
      const item = JSON.parse(source);
      return /^\d{1,2}:\d{2}$/.test(item.time) && item.text
        ? [{ time: item.time as string, text: item.text as string }]
        : [];
    } catch {
      return [];
    }
  });
  return { summary, moments: moments.slice(0, 2) };
}

/** Formats clip timestamps consistently in the carousel and observation list. */
export function mediaTimestamp(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** Keeps only this item's prompt while retaining the model's own multimodal template. */
export function mediaChatTemplate(template: string): string {
  return `{%- set media_turn = namespace(index=0, messages=[]) -%}
{%- for message in messages -%}
  {%- if message.role == 'user' -%}{%- set media_turn.index = loop.index0 -%}{%- endif -%}
{%- endfor -%}
{%- for message in messages -%}
  {%- if message.role == 'system' or loop.index0 >= media_turn.index -%}
    {%- set media_turn.messages = media_turn.messages + [message] -%}
  {%- endif -%}
{%- endfor -%}
{%- set messages = media_turn.messages -%}
${template}`;
}

/** Labels interleaved raw images with timestamps; the library handles image preprocessing. */
export function mediaPrompt(item: MediaItem, frames: MediaFrame[]): ChatMessageContent {
  if (!frames.length) throw new Error('No images were read from this item.');
  return [
    ...frames.flatMap((frame): (string | { kind: 'image'; image: ImageBuffer })[] => [
      `\nTimestamp ${mediaTimestamp(frame.seconds)}:\n`,
      { kind: 'image', image: frame.image },
    ]),
    item.kind === 'video'
      ? `\nDescribe what you can see in these ${frames.length} sampled images from a ${Math.round(item.duration)}-second clip as a whole. Return the requested JSON.`
      : '\nDescribe this photo. Return the requested JSON.',
  ];
}

/** Decodes through the same Skia RGBA conversion used by the CV and image chat demos. */
async function readPixels(uri: string): Promise<ImageBuffer> {
  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('Could not read this image.');
  try {
    return skImageToBuffer(image);
  } finally {
    image.dispose();
  }
}

/** Extracts bounded, evenly spaced frames on device; always releases the native player. */
async function videoFrames(uri: string, seconds: number[]): Promise<string[]> {
  const player = createVideoPlayer(null);
  const files: string[] = [];
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
          finish(new Error(error?.message || 'Could not load this clip.'));
      });
      const timeout = setTimeout(
        () => finish(new Error('The clip took too long to open. Try another video.')),
        20_000
      );
      void player
        .replaceAsync(uri)
        .catch((cause: unknown) =>
          finish(cause instanceof Error ? cause : new Error(String(cause)))
        );
    });
    const thumbnails = await player.generateThumbnailsAsync(seconds, {
      maxWidth: 800,
      maxHeight: 800,
    });
    if (thumbnails.length !== seconds.length)
      throw new Error('Could not read all sampled frames. Try another clip.');
    for (const thumbnail of thumbnails.sort((a, b) => a.requestedTime - b.requestedTime)) {
      const context = ImageManipulator.manipulate(thumbnail);
      try {
        const image = await context.renderAsync();
        try {
          files.push((await image.saveAsync({ format: SaveFormat.PNG })).uri);
        } finally {
          image.release();
        }
      } finally {
        context.release();
      }
    }
    return files;
  } catch (cause) {
    await Promise.all(
      files.map((file) => RNBlobUtil.fs.unlink(file.replace('file://', '')).catch(() => {}))
    );
    throw cause;
  } finally {
    player.release();
  }
}

/** Picks a small collection, preserving photo URIs and creating local video previews. */
export async function pickMedia(): Promise<MediaItem[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    selectionLimit: COLLECTION_LIMIT,
    orderedSelection: true,
    quality: 1,
  });
  if (result.canceled) return [];
  const assets = result.assets.slice(0, COLLECTION_LIMIT);
  if (
    assets.some(
      (asset) =>
        asset.type === 'video' && (!asset.duration || asset.duration / 1000 > MAX_CLIP_SECONDS)
    )
  ) {
    throw new Error('Choose videos up to 60 seconds long.');
  }
  const items: MediaItem[] = [];
  try {
    for (const asset of assets) {
      const kind = asset.type === 'video' ? 'video' : 'photo';
      const preview = kind === 'video' ? (await videoFrames(asset.uri, [0]))[0] : asset.uri;
      if (!preview) throw new Error('Could not create a video preview. Try another clip.');
      items.push({
        id: `${asset.uri}-${items.length}`,
        uri: asset.uri,
        preview,
        name: asset.fileName || `${kind === 'video' ? 'Video' : 'Photo'} ${items.length + 1}`,
        kind,
        temporaryPreview: kind === 'video',
        frameCount: kind === 'video' ? FRAME_COUNT : 1,
        duration: (asset.duration ?? 0) / 1000,
        phase: 'queued',
        description: '',
      });
    }
  } catch (cause) {
    releaseMediaPreviews(items);
    throw cause;
  }
  return items;
}

/** Reads one photo or four sampled frames, disposing temporary video frame files afterwards. */
export async function readMedia(
  item: MediaItem,
  onProgress?: FrameProgress
): Promise<MediaFrame[]> {
  if (item.kind === 'photo') {
    const context = ImageManipulator.manipulate(item.uri).resize({ width: 800 });
    let temporary: string | undefined;
    try {
      const resized = await context.renderAsync();
      try {
        temporary = (await resized.saveAsync({ format: SaveFormat.PNG })).uri;
      } finally {
        resized.release();
      }
      const image = await readPixels(temporary);
      onProgress?.(1, 1, 0);
      return [{ image, seconds: 0 }];
    } finally {
      context.release();
      if (temporary) await RNBlobUtil.fs.unlink(temporary.replace('file://', '')).catch(() => {});
    }
  }
  const times = Array.from(
    { length: FRAME_COUNT },
    (_, index) => (Math.max(0, item.duration - 0.1) * index) / (FRAME_COUNT - 1)
  );
  const files = await videoFrames(item.uri, times);
  try {
    const frames: MediaFrame[] = [];
    for (const [index, file] of files.entries()) {
      frames.push({ image: await readPixels(file), seconds: times[index] });
      onProgress?.(index + 1, files.length, times[index]);
    }
    return frames;
  } finally {
    await Promise.all(
      files.map((file) => RNBlobUtil.fs.unlink(file.replace('file://', '')).catch(() => {}))
    );
  }
}

/** Cache key for the wrapped tokenizer configuration. */
export function mediaConfigKey(content: string): string {
  let hash = 5381;
  for (let index = 0; index < content.length; index++)
    hash = (((hash << 5) + hash) ^ content.charCodeAt(index)) >>> 0;
  return hash.toString(36);
}

/** Removes generated video previews without touching the user's original media. */
export function releaseMediaPreviews(items: MediaItem[]): void {
  for (const item of items) {
    if (item.temporaryPreview)
      void RNBlobUtil.fs.unlink(item.preview.replace('file://', '')).catch(() => {});
  }
}
