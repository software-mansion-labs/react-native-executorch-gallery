import React, { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { ObjectDetection } from 'react-native-executorch';
import { Camera, type CameraDevice, type CameraFrameOutput } from 'react-native-vision-camera';

import { DetectionOverlay } from '@/components/DetectionOverlay';
import type { ViewportTransform } from '@/components/PhotoPicker';
import { borderWidth, radius, useTheme } from '@/theme';

export type ImageSize = {
  width: number;
  height: number;
};

export interface RealtimeDetectionViewportProps {
  /** Active camera capture device. */
  device?: CameraDevice;
  /** Whether camera permission is authorized. */
  hasPermission: boolean;
  /** Camera frame output pipeline. */
  frameOutput?: CameraFrameOutput;
  /** List of real-time object detections to project over the viewfinder. */
  detections: ObjectDetection<'xyxy', string>[];
  /** Resolution of the model input buffer. */
  inputSize: ImageSize;
  /** Aspect ratio of the camera sensor frame (e.g. { width: 1080, height: 1920 } or { width: 720, height: 1280 }). */
  frameSize?: ImageSize;
}

/**
 * Normalizes bounding box coordinates when running on Android sideways sensors,
 * where the Vulkan resizer shader's orientation mapping rotates the tensor by 180°.
 */
function normalizeDetectionBoxes(
  detections: ObjectDetection<'xyxy', string>[],
  inputSize: ImageSize,
  frameSize?: ImageSize
): ObjectDetection<'xyxy', string>[] {
  const isSideways =
    frameSize && (frameSize.height > frameSize.width || frameSize.width > frameSize.height);

  if (!isSideways) {
    return detections;
  }

  const { width: iw, height: ih } = inputSize;
  return detections.map((d) => ({
    ...d,
    box: {
      ...d.box,
      xmin: iw - d.box.xmax,
      xmax: iw - d.box.xmin,
      ymin: ih - d.box.ymax,
      ymax: ih - d.box.ymin,
    },
  }));
}

/**
 * Computes the 2D geometric viewport transformation mapping model input space
 * to the visible viewfinder canvas under `resizeMode="cover"`.
 */
function computeViewportTransform(
  viewport: ImageSize,
  inputSize: ImageSize,
  frameSize?: ImageSize
): ViewportTransform {
  const { width: vw, height: vh } = viewport;
  if (vw <= 0 || vh <= 0) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }

  if (frameSize && frameSize.width > 0 && frameSize.height > 0) {
    const resizerScale = Math.max(
      inputSize.width / frameSize.width,
      inputSize.height / frameSize.height
    );
    const viewScale = Math.max(vw / frameSize.width, vh / frameSize.height);
    const scale = viewScale / resizerScale;
    const offsetX = (vw - inputSize.width * scale) / 2;
    const offsetY = (vh - inputSize.height * scale) / 2;
    return { scale, offsetX, offsetY };
  }

  const scale = Math.max(vw / inputSize.width, vh / inputSize.height);
  const offsetX = (vw - inputSize.width * scale) / 2;
  const offsetY = (vh - inputSize.height * scale) / 2;
  return { scale, offsetX, offsetY };
}

/**
 * Viewport rendering the continuous live Camera preview and scaling bounding box overlays
 * to accurately align with the camera viewfinder under `resizeMode="cover"`.
 */
export function RealtimeDetectionViewport({
  device,
  hasPermission,
  frameOutput,
  detections,
  inputSize,
  frameSize,
}: RealtimeDetectionViewportProps) {
  const { colors } = useTheme();
  const [viewLayout, setViewLayout] = useState<ImageSize>({
    width: 0,
    height: 0,
  });

  const transform = computeViewportTransform(viewLayout, inputSize, frameSize);
  const normalizedDetections = normalizeDetectionBoxes(detections, inputSize, frameSize);

  return (
    <View
      style={[
        styles.viewport,
        { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
      ]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setViewLayout({ width, height });
      }}
    >
      {device && hasPermission ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          orientationSource="interface"
          outputs={frameOutput ? [frameOutput] : undefined}
          resizeMode="cover"
        />
      ) : null}
      <DetectionOverlay detections={normalizedDetections} transform={transform} />
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth,
    position: 'relative',
  },
});
