import { RainCanvas } from '@/components/silhouette-rain/RainCanvas';
import { useDemoClip } from '@/hooks/silhouette-rain/useDemoClip';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { SilhouetteRainView } from '@/components/silhouette-rain/SilhouetteRainView';
import { useSilhouetteRain } from '@/hooks/silhouette-rain/useSilhouetteRain';
import { useModelControls, type ModelControls } from '@/hooks/useModelControls';
import { RAIN_MODEL } from '@/lib/silhouette-rain/segmenter';

function RainSession({ model }: { model: ModelControls }) {
  const rain = useSilhouetteRain(model.loaded);
  const demo = useDemoClip(rain.openClip);
  return (
    <TaskScreen
      title="Silhouette rain"
      model={model}
      status={rain.status}
      busy={rain.playing}
      error={rain.error || demo.error}
      scrollable={false}
      edgeToEdge
      background={
        rain.hasClip ? (
          <RainCanvas
            enabled={rain.effectEnabled}
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
      <SilhouetteRainView rain={rain} model={model} demo={demo} />
    </TaskScreen>
  );
}

function SilhouetteRainTask() {
  const model = useModelControls(RAIN_MODEL.modelPath, { name: 'Selfie Segmentation' });
  return <RainSession key={model.revision} model={model} />;
}

export default function SilhouetteRainScreen() {
  return (
    <ScreenWrapper unmountOnBlur edgeToEdge>
      <SilhouetteRainTask />
    </ScreenWrapper>
  );
}
