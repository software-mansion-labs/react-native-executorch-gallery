import { ScreenWrapper } from '@/components/ScreenWrapper';
import { MeetingTask } from '@/components/meeting/MeetingTask';

export default function SpeakerDiarizationScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <MeetingTask transcribe={false} />
    </ScreenWrapper>
  );
}
