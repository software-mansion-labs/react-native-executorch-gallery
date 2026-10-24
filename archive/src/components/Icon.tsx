import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type IconName =
  | 'scan'
  | 'chat'
  | 'embeddings'
  | 'mic'
  | 'audio'
  | 'photo'
  | 'camera'
  | 'bolt'
  | 'chevronRight'
  | 'sparkle'
  | 'palette'
  | 'textDoc'
  | 'layers'
  | 'person'
  | 'brush'
  | 'wand'
  | 'shapes'
  | 'splitMask'
  | 'overlappingCircles'
  | 'arrowUp'
  | 'arrowDown'
  | 'download'
  | 'cloudDownload'
  | 'send'
  | 'close'
  | 'stop'
  | 'trash'
  | 'eye'
  | 'pulse'
  | 'shield'
  | 'search'
  | 'videocam'
  | 'record';

const ICON_MAP: Record<IconName, keyof typeof Ionicons.glyphMap> = {
  scan: 'scan-outline',
  chat: 'chatbubble-outline',
  embeddings: 'layers-outline',
  search: 'search-outline',
  mic: 'mic-outline',
  audio: 'volume-high-outline',
  photo: 'image-outline',
  camera: 'camera-outline',
  videocam: 'videocam-outline',
  record: 'radio-button-on',
  bolt: 'flash-outline',
  chevronRight: 'chevron-forward',
  sparkle: 'sparkles',
  palette: 'color-palette-outline',
  textDoc: 'document-text-outline',
  layers: 'layers-outline',
  person: 'person-outline',
  brush: 'brush-outline',
  wand: 'color-wand-outline',
  shapes: 'shapes-outline',
  splitMask: 'color-filter-outline',
  overlappingCircles: 'copy-outline',
  arrowUp: 'arrow-up',
  arrowDown: 'arrow-down',
  download: 'download-outline',
  cloudDownload: 'cloud-download-outline',
  send: 'send-outline',
  close: 'close',
  stop: 'stop',
  trash: 'trash-outline',
  eye: 'eye-outline',
  pulse: 'pulse-outline',
  shield: 'shield-outline',
};

export interface IconProps {
  /** Name of the vector icon to draw. */
  name: IconName;
  /** Size in logical points (width and height). */
  size?: number;
  /** Hex stroke color. */
  color?: string;
  /** Stroke width (ignored, kept for API compat). */
  strokeWidth?: number;
}

/**
 * Minimalist vector icon component using Ionicons.
 *
 * @param props Icon name, bounding size, color, and stroke weight.
 * @returns Rendered vector icon.
 */
export function Icon({ name, size = 20, color = '#2563EB' }: IconProps) {
  const iconName = ICON_MAP[name] ?? 'help-outline';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={iconName} size={size} color={color} />
    </View>
  );
}
