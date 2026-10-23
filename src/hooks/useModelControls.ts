import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';

/**
 * Keeps model loading explicit and confirms deletion of its cached weights.
 * Returns the load gate, deletion state, error, and load/delete handlers.
 * Pass the resolved local model path to remove; remote URLs are never deleted.
 */
export function useModelControls() {
  const [loaded, setLoaded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const removing = useRef(false);

  const load = () => {
    setError(null);
    setLoaded(true);
  };

  const remove = (path: string | undefined) => {
    if (!path || removing.current) return;
    Alert.alert(
      'Delete model?',
      'Remove the downloaded weights from this device? You can download them again.',
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
            try {
              const localPath = path.replace(/^file:\/\//, '');
              if (!localPath.startsWith('/')) throw new Error('The model is not stored locally.');
              if (await RNBlobUtil.fs.exists(localPath)) await RNBlobUtil.fs.unlink(localPath);
              setLoaded(false);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : String(cause));
            } finally {
              removing.current = false;
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const unload = () => {
    setError(null);
    setLoaded(false);
  };

  return { loaded, deleting, error, load, unload, remove };
}
