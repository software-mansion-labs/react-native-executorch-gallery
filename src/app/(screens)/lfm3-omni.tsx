import { ScreenWrapper } from '@/components/ScreenWrapper';
import { OmniDemo } from '@/components/omni/OmniDemo';

export default function OmniScreen() {
  return (
    <ScreenWrapper unmountOnBlur>
      <OmniDemo />
    </ScreenWrapper>
  );
}
