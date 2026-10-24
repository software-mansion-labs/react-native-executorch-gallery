import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ObjectDetection } from 'react-native-executorch';

import type { ViewportTransform } from '@/components/PhotoPicker';
import { domainColor } from '@/lib/labels';
import { radius } from '@/theme';

export interface DetectionOverlayProps {
  /** Array of bounding box detections returned by the object detector. */
  detections: ObjectDetection<'xyxy', string>[];
  /** Geometric viewport transformation mapping pixel coordinates to screen bounds. */
  transform: ViewportTransform;
}

/**
 * Draws spatial bounding boxes and class labels over the displayed photo.
 *
 * Mappable coordinates from source image pixel space (`xyxy`) to viewport
 * coordinate space via {@link ViewportTransform}.
 *
 * @param props Detection boxes and active viewport coordinate transform.
 * @returns Absolutely positioned bounding boxes and label badges.
 */
export function DetectionOverlay({ detections, transform }: DetectionOverlayProps) {
  const { scale, offsetX, offsetY } = transform;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {detections.map((d, i) => {
        const color = domainColor(d.label);
        const left = Math.round(offsetX + d.box.xmin * scale);
        const top = Math.round(offsetY + d.box.ymin * scale);
        const width = Math.round((d.box.xmax - d.box.xmin) * scale);
        const height = Math.round((d.box.ymax - d.box.ymin) * scale);
        const isNearTop = top < 24;

        return (
          <View
            key={i}
            style={[
              styles.box,
              {
                left,
                top,
                width,
                height,
                borderColor: color,
                backgroundColor: color + '12',
              },
            ]}
          >
            <View
              style={[
                styles.tag,
                {
                  backgroundColor: color,
                  top: isNearTop ? 2 : -22,
                  left: isNearTop ? 2 : -1,
                },
              ]}
            >
              <Text style={styles.tagText} numberOfLines={1}>
                {d.label} {Math.round(d.confidence * 100)}%
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: radius.xs,
  },
  tag: {
    position: 'absolute',
    alignSelf: 'flex-start',
    minWidth: 90,
    flexShrink: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
});
