import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

export type AppearancePreference = 'system' | 'light' | 'dark';

let preference: AppearancePreference = 'system';
const listeners = new Set<() => void>();
const getPreference = () => preference;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

function setPreference(value: AppearancePreference) {
  preference = value;
  Appearance.setColorScheme?.(value === 'system' ? 'unspecified' : value);
  listeners.forEach((listener) => listener());
}

/** Returns the current session’s appearance choice and app-wide setter. */
export function useAppearance() {
  return {
    preference: useSyncExternalStore(subscribe, getPreference, getPreference),
    setPreference,
  };
}
