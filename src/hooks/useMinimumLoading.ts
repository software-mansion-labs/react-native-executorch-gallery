import { useEffect, useState } from 'react';

import { tokens } from '@/theme';

/**
 * Keeps an active model's loading presentation visible for a minimum duration.
 * @param active Whether a load has been requested without an error or deletion.
 * @param ready Whether the model has actually finished loading.
 * @returns Whether to show loading; slow loads wait for readiness and cancelled loads stop immediately.
 */
export function useMinimumLoading(active: boolean, ready: boolean) {
  const [window, setWindow] = useState({ active, elapsed: false });

  if (window.active !== active) {
    setWindow({ active, elapsed: false });
  }

  useEffect(() => {
    if (!active) return;

    const timer = setTimeout(
      () => setWindow({ active, elapsed: true }),
      tokens.motion.modelMinimumLoadingDuration
    );
    return () => clearTimeout(timer);
  }, [active]);

  return active && (!ready || window.active !== active || !window.elapsed);
}
