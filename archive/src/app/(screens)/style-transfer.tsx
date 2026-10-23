import { useState } from 'react';
import { models, useStyleTransfer } from 'react-native-executorch';

import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { StyleTransferOverlay } from '@/components/StyleTransferOverlay';
import { TaskScreen } from '@/components/TaskScreen';

import { useDisposableImage } from '@/hooks/useDisposableImage';

import { deleteCachedFiles } from '@/lib/deleteCachedFiles';
import { bufferToSkImage } from '@/lib/image';

const MODEL = models.styleTransfer.MOSAIC.DEFAULT;

function StyleTransferTask() {
  const [loaded, setLoaded] = useState(false);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [styledImage, setStyledImage] = useDisposableImage();
  const [showOriginal, setShowOriginal] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styler = useStyleTransfer(MODEL, { preventLoad: !loaded });

  const run = async () => {
    if (busy || !image || !styler.transferStyle) return;
    setBusy(true);
    setStyledImage(null);
    setLatency(null);
    setError(null);
    try {
      const t0 = Date.now();
      const output = await styler.transferStyle(image.buffer);
      setLatency(Date.now() - t0);

      const skiaStyled = bufferToSkImage(output);
      if (!skiaStyled) throw new Error('Failed to create styled image from output data');
      setStyledImage(skiaStyled);
      setShowOriginal(false);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TaskScreen
      title="Style Transfer"
      subtitle="Mosaic Style"
      status={{ ...styler, error: error || styler.error }}
      onLoadModel={!loaded ? () => setLoaded(true) : undefined}
      canRun={!!image && styler.isReady && !busy}
      busy={busy}
      onRun={run}
      runLabel="Transfer Style"
      meta={latency != null ? `Inference ${latency} ms` : undefined}
      onDeleteModel={async () => {
        await deleteCachedFiles(styler.resource);
        setLoaded(false);
      }}
    >
      <PhotoPicker
        busy={busy}
        overlayImage={showOriginal ? null : styledImage}
        overlayOpacity={1}
        onPick={(img) => {
          setImage(img);
          setStyledImage(null);
          setLatency(null);
          setError(null);
        }}
        renderOverlay={() =>
          styledImage ? (
            <StyleTransferOverlay
              showOriginal={showOriginal}
              onPressInOriginal={() => setShowOriginal(true)}
              onPressOutOriginal={() => setShowOriginal(false)}
            />
          ) : null
        }
      />
    </TaskScreen>
  );
}

export default function StyleTransferScreen() {
  return (
    <ScreenWrapper>
      <StyleTransferTask />
    </ScreenWrapper>
  );
}
