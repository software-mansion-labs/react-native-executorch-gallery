import { Ionicons } from '@expo/vector-icons';

import { IconToggle } from '@/components/IconToggle';
import { useTheme } from '@/theme';

/** Switches between filtered and original text in the composer. */
export function PrivacyFilterToggle({
  original,
  onChange,
}: {
  original: boolean;
  onChange: (original: boolean) => void;
}) {
  const { iconSize } = useTheme();
  return (
    <IconToggle
      value={original}
      onChange={onChange}
      label="Show original text"
      renderIcon={(value, color) => (
        <Ionicons
          name={value ? 'eye-outline' : 'eye-off-outline'}
          size={iconSize.small}
          color={color}
          accessible={false}
        />
      )}
    />
  );
}
