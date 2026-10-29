import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import RNBlobUtil from 'react-native-blob-util';

import icons from '@/assets/icons/chat-icons.json';
import { IconToggle } from '@/components/IconToggle';
import { useTheme } from '@/theme';

/** Chooses direct answers or reasoning for the next chat message. */
export function ChatThinkingToggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled: boolean;
}) {
  const { iconSize } = useTheme();
  return (
    <IconToggle
      value={enabled}
      onChange={onChange}
      disabled={disabled}
      label="Thinking"
      renderIcon={(value, color) =>
        value ? (
          <Image
            source={{
              uri: `data:image/svg+xml;base64,${RNBlobUtil.base64.encode(icons.brain.replace('currentColor', color))}`,
            }}
            style={{ width: iconSize.small, height: iconSize.small }}
            contentFit="contain"
            accessible={false}
          />
        ) : (
          <Ionicons name="flash-outline" size={iconSize.small} color={color} accessible={false} />
        )
      }
    />
  );
}
