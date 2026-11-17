import { useEffect, useRef, useState } from 'react';
import RNBlobUtil from 'react-native-blob-util';

const DEMO_URL = 'https://videos.pexels.com/video-files/8502433/8502433-hd_1080_1920_25fps.mp4';

/** Downloads and caches the portrait sample on request, then opens it for playback. */
export function useDemoClip(openClip: (uri: string, autoplay?: boolean) => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  const pending = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const load = async () => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError(null);
    const path = `${RNBlobUtil.fs.dirs.DocumentDir}/silhouette-demo-8502433.mp4`;
    const partial = `${path}.partial`;
    try {
      if (!(await RNBlobUtil.fs.exists(path))) {
        const result = await RNBlobUtil.config({ path: partial }).fetch('GET', DEMO_URL);
        if (result.info().status !== 200) throw new Error('Could not download the demo clip.');
        await RNBlobUtil.fs.mv(partial, path);
      }
      if (active.current) openClip(`file://${path}`, true);
    } catch (cause) {
      await RNBlobUtil.fs.unlink(partial).catch(() => {});
      if (active.current) setError(String(cause));
    } finally {
      pending.current = false;
      if (active.current) setLoading(false);
    }
  };
  return { load, loading, error };
}
