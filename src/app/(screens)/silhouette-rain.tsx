import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { SilhouetteRainView } from '@/components/silhouette-rain/SilhouetteRainView';
import { SilhouetteRainViewport } from '@/components/silhouette-rain/SilhouetteRainViewport';
import { useSilhouetteRain } from '@/hooks/silhouette-rain/useSilhouetteRain';
import { useModelControls, type ModelControls } from '@/hooks/useModelControls';
import { RAIN_MODEL } from '@/lib/silhouette-rain/segmenter';

function RainSession({ model }: { model: ModelControls }) {
  const rain = useSilhouetteRain(model.loaded, model.prepared);
  return (
    <TaskScreen
      title="Matrix code rain"
      model={model}
      status={rain.status}
      busy={rain.isActive}
      error={rain.error}
      scrollable={false}
      edgeToEdge
      background={rain.showCamera ? <SilhouetteRainViewport rain={rain} /> : undefined}
    >
      <SilhouetteRainView rain={rain} model={model} />
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
