import { useState } from 'react';
import { Linking } from 'react-native';

/** Opens a user-selected external link and returns a readable error when opening fails. */
export function useExternalLink() {
  const [error, setError] = useState<string>();

  const openLink = async (url: string) => {
    setError(undefined);

    try {
      await Linking.openURL(url);
    } catch {
      setError('Could not open this link. Please try again.');
    }
  };

  return { openLink, error };
}
