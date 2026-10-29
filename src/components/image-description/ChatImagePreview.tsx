import { StyleSheet, View } from 'react-native';
import { Canvas, Image as SkiaImage, type SkImage } from '@shopify/react-native-skia';

import { IconButton } from '@/components/IconButton';
import { tokens } from '@/theme';

/** Shows the very same decoded Skia image used for inference, with a remove action. */
export function ChatImagePreview({
  image,
  onRemove,
  disabled,
}: {
  image: SkImage;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.preview} accessibilityLabel="Attached photo" accessible>
        <Canvas style={StyleSheet.absoluteFill}>
          <SkiaImage image={image} fit="cover" x={0} y={0} width={size} height={size} />
        </Canvas>
      </View>
      <IconButton
        icon="close"
        accessibilityLabel="Remove attached photo"
        disabled={disabled}
        onPress={onRemove}
      />
    </View>
  );
}
const { spacing, layout, radius } = tokens;
const size = layout.photoControlSize;
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  preview: { width: size, height: size, borderRadius: radius.card, overflow: 'hidden' },
});
