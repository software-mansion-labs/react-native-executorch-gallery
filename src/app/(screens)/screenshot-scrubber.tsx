import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { ScrubberView } from '@/components/screenshot-scrubber/ScrubberView';
import { useModelControls, type ModelControls } from '@/hooks/useModelControls';
import {
  SCRUBBER_SOURCES,
  useScreenshotScrubber,
} from '@/hooks/screenshot-scrubber/useScreenshotScrubber';

function ScrubberSession({ model }: { model: ModelControls }) {
  const scrubber = useScreenshotScrubber(model);
  return (
    <TaskScreen
      title="Screenshot scrubber"
      model={model}
      status={scrubber.status}
      busy={scrubber.busy}
      error={scrubber.error}
    >
      <ScrubberView model={model} scrubber={scrubber} />
    </TaskScreen>
  );
}

function ScreenshotScrubberTask() {
  const model = useModelControls(SCRUBBER_SOURCES, { name: 'PaddleOCR + OpenAI Privacy Filter' });
  return <ScrubberSession key={model.revision} model={model} />;
}

export default function ScreenshotScrubberScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <ScreenshotScrubberTask />
    </ScreenWrapper>
  );
}
