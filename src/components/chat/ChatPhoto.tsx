import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Image as SkiaImage, useImage } from '@shopify/react-native-skia';

import { tokens } from '@/theme';

/** Displays a submitted photo using the same aspect-fit Skia canvas as the CV demos. */
export function ChatPhoto({ uri }: { uri: string }) {
  const image = useImage(uri);
  const [width, setWidth] = useState(0);
  return (
    <View
      style={styles.photo}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityLabel="Submitted photo"
      accessible
    >
      {image && width > 0 && (
        <Canvas style={StyleSheet.absoluteFill}>
          <SkiaImage
            image={image}
            fit="contain"
            x={0}
            y={0}
            width={width}
            height={tokens.layout.chatPhotoHeight}
          />
        </Canvas>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  photo: {
    width: '100%',
    height: tokens.layout.chatPhotoHeight,
    borderRadius: tokens.radius.annotation,
    overflow: 'hidden',
  },
});
