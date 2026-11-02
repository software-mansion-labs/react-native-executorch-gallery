import RNBlobUtil from 'react-native-blob-util';
import { getResourceCachePath } from 'react-native-executorch';

/** Uses the library cache path for status, size and deletion checks. */
export const modelCachePath = getResourceCachePath;

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
