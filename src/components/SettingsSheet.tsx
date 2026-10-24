import { BottomSheet } from '@/components/BottomSheet';
import { AboutSection } from '@/components/AboutSection';
import { AppearanceOptions } from '@/components/AppearanceOptions';

type SettingsSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/** The home overflow sheet, containing appearance preferences and app information. */
export function SettingsSheet({ visible, onClose }: SettingsSheetProps) {
  return (
    <BottomSheet title="Settings" visible={visible} onClose={onClose}>
      <AppearanceOptions />
      <AboutSection />
    </BottomSheet>
  );
}
