import { ScreenWrapper } from '@/components/ScreenWrapper';
import { MeetingTask } from '@/components/meeting/MeetingTask';

export default function MeetingTranscriptScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <MeetingTask />
    </ScreenWrapper>
  );
}
