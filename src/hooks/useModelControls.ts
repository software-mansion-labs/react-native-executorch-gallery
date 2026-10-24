import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';

import { MODEL_DOWNLOAD_BYTES } from '@/lib/model-sizes';
import { cachedModelBytes, formatModelSize, modelCachePath } from '@/lib/model-cache';

export type ModelInfo = {
  name: string;
};

/**
 * Prepares one task model only after an explicit load request.
 * Given its source and metadata, returns the load gate, setup label, on-disk
 * cache size, deletion action, and a revision for resetting task data after deletion.
 * Cache status comes from the final weights file, without downloading or a registry.
 */
export function useModelControls(source: string, info: ModelInfo) {
  const path = modelCachePath(source);
  const [loaded, setLoaded] = useState(false);
  const [prepared, setPrepared] = useState(false);
  const markPrepared = useCallback(() => setPrepared(true), []);
  const [storedBytes, setStoredBytes] = useState<number | null>();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const removing = useRef(false);
  const cacheRequest = useRef(0);

  const refreshCache = useCallback(async () => {
    const request = ++cacheRequest.current;
    const bytes = await cachedModelBytes(path);
    if (request === cacheRequest.current) setStoredBytes(bytes);
  }, [path]);

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
              await RNBlobUtil.fs.unlink(path);
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

  const downloadBytes = MODEL_DOWNLOAD_BYTES[source.split('?')[0].split('/').pop() ?? ''];
  const loadLabel =
    storedBytes === undefined ? 'Checking model…' : storedBytes ? 'Load model' : 'Download model';
  const downloadSizeLabel =
    storedBytes === null && downloadBytes
      ? downloadBytes >= 1_000_000_000
        ? formatModelSize(downloadBytes)
        : `${Math.ceil(downloadBytes / 1_000_000)} MB`
      : undefined;

  return {
    info,
    loaded,
    prepared,
    markPrepared,
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
