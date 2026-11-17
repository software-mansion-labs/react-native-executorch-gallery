import { useState } from 'react';
import { RainCanvas } from '@/components/silhouette-rain/RainCanvas';
import { useDemoClip } from '@/hooks/silhouette-rain/useDemoClip';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { SilhouetteRainView } from '@/components/silhouette-rain/SilhouetteRainView';
import { useSilhouetteRain } from '@/hooks/silhouette-rain/useSilhouetteRain';
import { useModelControls, type ModelControls } from '@/hooks/useModelControls';
import { SEGMENTERS, segmenterLabel, type SegmenterId } from '@/lib/silhouette-rain/segmenter';

function RainSession({
  model,
  modelId,
  onModelChange,
}: {
  model: ModelControls;
  modelId: SegmenterId;
  onModelChange: (id: SegmenterId) => void;
}) {
  const rain = useSilhouetteRain(model.loaded, modelId);
  const demo = useDemoClip(rain.openClip);
  return (
    <TaskScreen
      title="Silhouette effects"
      model={model}
      status={rain.status}
      busy={rain.playing}
      error={rain.error || demo.error}
      scrollable={false}
      edgeToEdge
      background={
        rain.hasClip ? (
          <RainCanvas
            effect={rain.effect}
            onMetrics={rain.setRenderStats}
            player={rain.player}
            mask={rain.mask}
            playing={rain.playing}
            collisions={rain.collisions}
            showMask={rain.showMask}
            aspectRatio={rain.aspectRatio}
            fullScreen
          />
        ) : undefined
      }
    >
      <SilhouetteRainView rain={rain} model={model} demo={demo} onModelChange={onModelChange} />
    </TaskScreen>
  );
}

function SilhouetteRainTask({
  modelId,
  onModelChange,
}: {
  modelId: SegmenterId;
  onModelChange: (id: SegmenterId) => void;
}) {
  const model = useModelControls(SEGMENTERS[modelId].config.modelPath, {
    name: segmenterLabel(modelId),
  });
  return (
    <RainSession
      key={model.revision}
      model={model}
      modelId={modelId}
      onModelChange={onModelChange}
    />
  );
}

export default function SilhouetteRainScreen() {
  const [modelId, setModelId] = useState<SegmenterId>('selfie');
  return (
    <ScreenWrapper unmountOnBlur edgeToEdge>
      <SilhouetteRainTask key={modelId} modelId={modelId} onModelChange={setModelId} />
    </ScreenWrapper>
  );
}
