import { Platform } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';

/** Matches the installed ExecuTorch fetcher's persistent cache naming. */
export function modelCachePath(source: string): string {
  if (!/^https?:\/\//.test(source)) return source.replace(/^file:\/\//, '');
  const url = source.split('?')[0];
  let hash = 5381;
  for (let index = 0; index < url.length; index++) {
    hash = (((hash << 5) + hash) ^ url.charCodeAt(index)) >>> 0;
  }
  const directory =
    Platform.OS === 'android'
      ? RNBlobUtil.fs.dirs.SDCardDir || RNBlobUtil.fs.dirs.DocumentDir
      : RNBlobUtil.fs.dirs.DocumentDir;
  return `${directory}/react-native-executorch/${hash}_${url.split('/').pop() || 'model'}`;
}

/** Reads only the final cache file; interrupted downloads use separate partial files. */
export async function cachedModelBytes(path: string): Promise<number | null> {
  try {
    const stat = await RNBlobUtil.fs.stat(path);
    return Number(stat.size) > 0 ? Number(stat.size) : null;
  } catch {
    return null;
  }
}

/** Formats actual on-disk bytes using decimal storage units. */
export function formatModelSize(bytes: number): string {
  return bytes >= 1_000_000_000
    ? `${(bytes / 1_000_000_000).toFixed(1)} GB`
    : `${(bytes / 1_000_000).toFixed(1)} MB`;
}
