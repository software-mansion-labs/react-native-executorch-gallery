import { useEffect, useState, type PropsWithChildren } from 'react';
import { Appearance } from 'react-native';

import { AppearanceContext, type AppearancePreference } from '@/context/AppearanceContext';

/** Applies a session-only appearance choice to app content and native UI. */
export function AppearanceProvider({ children }: PropsWithChildren) {
  const [preference, setPreference] = useState<AppearancePreference>('system');

  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  return (
    <AppearanceContext.Provider value={{ preference, setPreference }}>
      {children}
    </AppearanceContext.Provider>
  );
}
