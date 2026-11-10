import { useState } from 'react';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { OmniDemo } from '@/components/omni/OmniDemo';
import type { OmniBackend } from '@/hooks/useOmni';

export default function OmniScreen() {
  const [backend, setBackend] = useState<OmniBackend>('xnnpack');
  return (
    <ScreenWrapper unmountOnBlur>
      <OmniDemo key={backend} backend={backend} setBackend={setBackend} />
    </ScreenWrapper>
  );
}
