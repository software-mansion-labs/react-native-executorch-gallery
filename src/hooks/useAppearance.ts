import { useContext } from 'react';

import { AppearanceContext } from '@/context/AppearanceContext';

/** Returns the current session’s appearance choice and app-wide setter. */
export function useAppearance() {
  const context = useContext(AppearanceContext);

  if (!context) throw new Error('useAppearance must be used within AppearanceProvider.');

  return context;
}
