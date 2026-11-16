import { useCallback, useEffect, useRef, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import RNBlobUtil from 'react-native-blob-util';
import { MEETING_ASSETS, validateMeetingAsset } from '@/lib/diarization/meetingAssets';

/** Imports the local Nemotron and Fluid assets with native contract validation and temporary-file cleanup.
 * Missing assets can be selected together or in several picks. No downloads or capture start on mount.
 * Returns import progress/readiness for the shared model setup control.
 */
export function useImportedMeetingModels(
  revision: number,
  deleting: boolean,
  refreshCache: () => Promise<void>,
  onError: (message: string | null) => void
) {
  const [missing, setMissing] = useState<number>();
  const [importing, setImporting] = useState(false);
  const mounted = useRef(true),
    working = useRef(false),
    checking = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++checking.current;
    const present = await Promise.all(
      MEETING_ASSETS.map((asset) => RNBlobUtil.fs.exists(asset.path))
    );
    if (mounted.current && request === checking.current)
      setMissing(present.filter((value) => !value).length);
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh().catch(() => {
      if (mounted.current) setMissing(MEETING_ASSETS.length);
    });
    return () => {
      mounted.current = false;
    };
  }, [revision, deleting, refresh]);
  const importModels = useCallback(async () => {
    if (working.current) return;
    working.current = true;
    onError(null);
    setImporting(true);
    const temporary: string[] = [];
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      temporary.push(
        ...result.assets.map((asset) => decodeURIComponent(asset.uri.replace(/^file:\/\//, '')))
      );
      const selected = [];
      const names = new Set<string>();
      for (let i = 0; i < result.assets.length; i++) {
        if (!mounted.current) return;
        const asset = result.assets[i],
          target = MEETING_ASSETS.find((item) => item.name === asset.name);
        if (!target)
          throw new Error(
            `${asset.name} is not a meeting model asset. Choose the exported Nemotron or Fluid Speech files and tokenizer.json.`
          );
        if (names.has(asset.name)) throw new Error(`Select ${asset.name} only once.`);
        names.add(asset.name);
        selected.push({ source: temporary[i], target });
      }
      for (const { source, target } of selected) {
        if (!mounted.current) return;
        await validateMeetingAsset(target.component, source);
      }
      if (!mounted.current) return;
      for (const { source, target } of selected) {
        const directory = target.path.slice(0, target.path.lastIndexOf('/'));
        if (!(await RNBlobUtil.fs.exists(directory))) await RNBlobUtil.fs.mkdir(directory);
        if (await RNBlobUtil.fs.exists(target.path)) await RNBlobUtil.fs.unlink(target.path);
        await RNBlobUtil.fs.mv(source, target.path);
      }
    } catch (error) {
      if (mounted.current) onError(error instanceof Error ? error.message : String(error));
    } finally {
      for (const path of temporary)
        if (path.startsWith(`${RNBlobUtil.fs.dirs.CacheDir}/`))
          await RNBlobUtil.fs.unlink(path).catch(() => {});
      await refreshCache().catch(() => {});
      await refresh().catch(() => {});
      working.current = false;
      if (mounted.current) setImporting(false);
    }
  }, [onError, refreshCache, refresh]);
  return { missing, importing, importModels };
}
