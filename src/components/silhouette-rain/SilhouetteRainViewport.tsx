import { StyleSheet, View } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { RainCanvas } from './RainCanvas';
import type { useSilhouetteRain } from '@/hooks/silhouette-rain/useSilhouetteRain';

/** Live selfie preview and an aligned, independent rain overlay. */
export function SilhouetteRainViewport({ rain }: { rain: ReturnType<typeof useSilhouetteRain> }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {rain.device && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={rain.device}
          isActive={rain.showCamera}
          orientationSource="interface"
          mirrorMode="on"
          outputs={[rain.frameOutput]}
          resizeMode="cover"
          onError={(error) => rain.onError(error.message)}
        />
      )}
      <RainCanvas
        enabled={rain.isActive}
        mask={rain.mask}
        playing={rain.isActive}
        aspectRatio={rain.aspectRatio}
      />
    </View>
  );
}
