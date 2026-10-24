import RNBlobUtil from 'react-native-blob-util';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Collects all local file paths from any nested structure. */
function collectLocalPaths(node: unknown): Set<string> {
  const out = new Set<string>();
  const visit = (current: unknown): void => {
    if (typeof current === 'string') {
      if (current.startsWith('/') || current.startsWith('file://')) {
        out.add(current);
      }
    } else if (Array.isArray(current)) {
      for (const item of current) visit(item);
    } else if (isPlainObject(current)) {
      for (const value of Object.values(current)) visit(value);
    }
  };
  visit(node);
  return out;
}

/**
 * Deletes the cached model files referenced by a downloaded resource config.
 *
 * Walks the config object recursively for local file paths and unlinks each one.
 * Safe to call repeatedly — missing files are ignored.
 *
 * @param resource The resolved resource config whose local paths should be removed.
 * @returns The number of files deleted.
 */
export async function deleteCachedFiles(resource: unknown): Promise<number> {
  if (!resource || typeof resource !== 'object') return 0;

  const paths = collectLocalPaths(resource);
  let deleted = 0;

  for (const path of paths) {
    const cleanPath = path.replace(/^file:\/\//, '');
    const existed = await RNBlobUtil.fs.exists(cleanPath).catch(() => false);
    if (existed) {
      await RNBlobUtil.fs.unlink(cleanPath).catch(() => {});
      deleted += 1;
    }
  }

  return deleted;
}
