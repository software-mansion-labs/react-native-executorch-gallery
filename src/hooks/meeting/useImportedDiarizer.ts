import { useCallback, useEffect, useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import RNBlobUtil from 'react-native-blob-util';
import { NEMOTRON_PATH, loadNemotron, disposeNemotron } from '@/lib/diarization/nemotron';

/** Imports a local exported model, validates its native contract, and refreshes model storage.
 * Only user-selected model assets are copied. The picker's temporary cache copy is removed afterward.
 * Returns import readiness and an explicit picker action; it never loads recording input or starts capture.
 */
export function useImportedDiarizer(
  revision: number,
  deleting: boolean,
  refreshCache: () => Promise<void>,
  onError: (message: string | null) => void
) {
  const [missing, setMissing] = useState<boolean>();
  const [importing, setImporting] = useState(false);
  const mounted = useRef(true);
  const working = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let current = true;
    void RNBlobUtil.fs
      .exists(NEMOTRON_PATH)
      .then((exists) => {
        if (current) setMissing(!exists);
      })
      .catch(() => {
        if (current) setMissing(true);
      });
    return () => {
      current = false;
      mounted.current = false;
    };
  }, [revision, deleting]);
  const importModel = useCallback(async () => {
    if (working.current) return;
    working.current = true;
    onError(null);
    setImporting(true);
    let temporary: string | undefined;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      temporary = decodeURIComponent(asset.uri.replace(/^file:\/\//, ''));
      if (!asset.name.toLowerCase().endsWith('.pte'))
        throw new Error('Choose the exported Nemotron .pte model file.');
      const candidate = await loadNemotron(temporary);
      await disposeNemotron(candidate);
      if (!mounted.current) return;
      const directory = NEMOTRON_PATH.slice(0, NEMOTRON_PATH.lastIndexOf('/'));
      if (!(await RNBlobUtil.fs.exists(directory))) await RNBlobUtil.fs.mkdir(directory);
      await RNBlobUtil.fs.mv(temporary, NEMOTRON_PATH);
      temporary = undefined;
      await refreshCache();
      if (mounted.current) setMissing(false);
    } catch (cause) {
      if (mounted.current) onError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (temporary?.startsWith(`${RNBlobUtil.fs.dirs.CacheDir}/`))
        await RNBlobUtil.fs.unlink(temporary).catch(() => {});
      working.current = false;
      if (mounted.current) setImporting(false);
    }
  }, [refreshCache, onError]);
  return { missing, importing, importModel };
}
