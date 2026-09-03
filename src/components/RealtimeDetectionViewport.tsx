import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ObjectDetection } from 'react-native-executorch';
import { Camera, type CameraDevice, type CameraFrameOutput } from 'react-native-vision-camera';

import { DetectionOverlay } from '@/components/DetectionOverlay';
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

  const { width: vw, height: vh } = viewLayout;

  // If we know the source camera frame aspect ratio (e.g. 1080x1920 in portrait),
  // and the resizer used scaleMode: 'cover' to crop it to inputSize (e.g. 960x960),
  // we compute the exact mapping between inputSize and the viewLayout:
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  if (vw > 0 && vh > 0) {
    if (frameSize && frameSize.width > 0 && frameSize.height > 0) {
      // 1. In resizer (scaleMode: 'cover'):
      // frame (fw x fh) is scaled by resizerScale = Math.max(iw / fw, ih / fh)
      // and center-cropped to (iw x ih).
      // A point (fx, fy) on the frame maps to input (ix, iy) via:
      // ix = (fx - fw/2) * resizerScale + iw/2
      // iy = (fy - fh/2) * resizerScale + ih/2
      // 2. In Camera (resizeMode: 'cover'):
      // frame (fw x fh) is scaled by viewScale = Math.max(vw / fw, vh / fh)
      // and center-cropped to (vw x vh).
      // vx = (fx - fw/2) * viewScale + vw/2
      // vy = (fy - fh/2) * viewScale + vh/2
      // Combining both:
      // (vx - vw/2) / viewScale = (ix - iw/2) / resizerScale
      // vx = (ix - iw/2) * (viewScale / resizerScale) + vw/2
      const fw = frameSize.width;
      const fh = frameSize.height;
      const resizerScale = Math.max(inputSize.width / fw, inputSize.height / fh);
      const viewScale = Math.max(vw / fw, vh / fh);
      scale = viewScale / resizerScale;
      offsetX = vw / 2 - (inputSize.width / 2) * scale;
      offsetY = vh / 2 - (inputSize.height / 2) * scale;
    } else {
      // Direct cover mapping from inputSize to viewport
      scale = Math.max(vw / inputSize.width, vh / inputSize.height);
      offsetX = (vw - inputSize.width * scale) / 2;
      offsetY = (vh - inputSize.height * scale) / 2;
    }
  }

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
          outputs={frameOutput ? [frameOutput] : undefined}
          resizeMode="cover"
        />
      ) : null}
      <DetectionOverlay
        detections={detections}
        transform={{
          scale,
          offsetX,
          offsetY,
        }}
      />
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
