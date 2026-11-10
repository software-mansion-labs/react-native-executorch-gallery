import { OmniConversation } from '@/components/omni/OmniConversation';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { TaskScreen } from '@/components/TaskScreen';
import { useOmni } from '@/hooks/omni/useOmni';

function OmniTask() {
  const omni = useOmni();
  return (
    <TaskScreen
      title="Omni conversation"
      model={omni.model}
      status={omni.status}
      error={omni.error}
      busy={omni.busy || omni.isRecording || omni.recordingStarting}
      scrollable={false}
    >
      <OmniConversation key={omni.revision} omni={omni} />
    </TaskScreen>
  );
}

export default function OmniScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <OmniTask />
    </ScreenWrapper>
  );
}
