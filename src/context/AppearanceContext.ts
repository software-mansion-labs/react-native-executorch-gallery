import { createContext } from 'react';

export type AppearancePreference = 'system' | 'light' | 'dark';

export type AppearanceContextValue = {
  preference: AppearancePreference;
  setPreference: (preference: AppearancePreference) => void;
};

export const AppearanceContext = createContext<AppearanceContextValue | undefined>(undefined);
