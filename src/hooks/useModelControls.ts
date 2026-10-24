import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';

import { MODEL_DOWNLOAD_BYTES } from '@/lib/model-sizes';
import { cachedModelBytes, formatModelSize, modelCachePath } from '@/lib/model-cache';

export type ModelInfo = {
  name: string;
};

/**
 * Prepares a task model (or a paired set of weights) only after an explicit load request.
 * Given its source and metadata, returns the load gate, setup label, on-disk
 * cache size, deletion action, and a revision for resetting task data after deletion.
 * Cache status comes from the final weights file, without downloading or a registry.
 */
export function useModelControls(source: string | readonly string[], info: ModelInfo) {
  const sources = useMemo(() => (typeof source === 'string' ? [source] : source), [source]);
  const paths = useMemo(() => sources.map(modelCachePath), [sources]);
  const [loaded, setLoaded] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const markPrepared = useCallback(() => setPrepared(true), []);
  const resetPreparation = useCallback(() => setPrepared(false), []);
  const [cache, setCache] = useState<(number | null)[]>();
  const storedBytes = cache
    ? cache.reduce<number>((sum, bytes) => sum + (bytes ?? 0), 0) || null
    : undefined;
  const downloaded = cache?.every((bytes) => bytes !== null) ?? false;
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const removing = useRef(false);
  const cacheRequest = useRef(0);

  const refreshCache = useCallback(async () => {
    const request = ++cacheRequest.current;
    const bytes = await Promise.all(paths.map(cachedModelBytes));
    if (request === cacheRequest.current) setCache(bytes);
  }, [paths]);

  useEffect(() => {
    void refreshCache();
    return () => {
      cacheRequest.current += 1;
    };
  }, [refreshCache]);

  const load = () => {
    if (removing.current || storedBytes === undefined) return;
    setError(null);
    setPrepared(false);
    setLoaded(true);
  };

  const loadFailed = useCallback((cause: unknown) => {
    setError(cause instanceof Error ? cause.message : String(cause));
    setPrepared(false);
    setLoaded(false);
  }, []);

  const remove = (disabled = false) => {
    if (disabled || removing.current || !storedBytes) return;
    Alert.alert(
      'Delete downloaded model?',
      `Remove ${formatModelSize(storedBytes)} from this device? You can download the model again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (removing.current) return;
            removing.current = true;
            setDeleting(true);
            setError(null);
            setPrepared(false);
            setLoaded(false);
            setRevision((value) => value + 1);
            try {
              await Promise.all(
                paths.map((path, index) =>
                  cache?.[index] ? RNBlobUtil.fs.unlink(path) : undefined
                )
              );
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : String(cause));
            } finally {
              await refreshCache();
              removing.current = false;
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const missingSources = sources.filter((_, index) => !cache?.[index]);
  const sizes = missingSources.map(
    (url) => MODEL_DOWNLOAD_BYTES[url.split('?')[0].split('/').pop() ?? '']
  );
  const downloadBytes = sizes.every(Boolean) ? sizes.reduce((sum, bytes) => sum + bytes, 0) : 0;
  const loadLabel =
    storedBytes === undefined ? 'Checking model…' : downloaded ? 'Load model' : 'Download model';
  const downloadSizeLabel =
    cache && !downloaded && downloadBytes
      ? downloadBytes >= 1_000_000_000
        ? formatModelSize(downloadBytes)
        : `${Math.ceil(downloadBytes / 1_000_000)} MB`
      : undefined;

  return {
    info,
    loaded,
    prepared,
    markPrepared,
    resetPreparation,
    storedBytes,
    deleting,
    error,
    revision,
    loadLabel,
    downloadSizeLabel,
    load,
    loadFailed,
    remove,
    refreshCache,
  };
}

export type ModelControls = ReturnType<typeof useModelControls>;
