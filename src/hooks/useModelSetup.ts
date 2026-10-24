import { useCallback, useLayoutEffect, useRef } from 'react';

import type { ModelStatus } from '@/components/ModelSheet';
import type { ModelControls } from '@/hooks/useModelControls';
import { useMinimumLoading } from '@/hooks/useMinimumLoading';

/** Coordinates minimum preparation and the actual indicator exit callback before exposing task controls. */
export function useModelSetup(model: ModelControls, status: ModelStatus) {
  const active = model.loaded && !status.error && !model.deleting;
  const preparing =
    status.isReady || !!status.resource || status.downloadProgress >= 100 || !!model.storedBytes;
  const preparingAnimation = useMinimumLoading(active && preparing, status.isReady);
  const loading = active && (!preparing || preparingAnimation);
  const ready = active && status.isReady && !loading;
  const latestReady = useRef(ready);
  useLayoutEffect(() => {
    latestReady.current = ready;
    return () => {
      latestReady.current = false;
    };
  }, [ready]);
  const { markPrepared } = model;
  const onExit = useCallback(() => {
    if (latestReady.current) markPrepared();
  }, [markPrepared]);
  return { preparing, loading, ready, onExit };
}
