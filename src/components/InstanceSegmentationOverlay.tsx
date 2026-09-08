import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BlendColor, Canvas, Image as SkiaImage, type SkImage } from '@shopify/react-native-skia';
import type { InstanceSegmentationResult } from 'react-native-executorch';
import type { ViewportTransform } from '@/components/PhotoPicker';
import { bufferToSkImage } from '@/lib/image';
import { radius } from '@/theme';

export interface InstanceSegmentationOverlayProps {
  /** Array of instance segmentation results containing boxes, masks, and class labels. */
  instances: InstanceSegmentationResult<'xyxy', string>[];
  /** Width of the photo in source pixels. */
  imageWidth: number;
  /** Height of the photo in source pixels. */
  imageHeight: number;
  /** Viewport coordinate transformation. */
  transform: ViewportTransform;
}

const MASK_COLORS = [
  { r: 42, g: 71, b: 255, a: 140 }, // Royal Cobalt
  { r: 217, g: 70, b: 239, a: 140 }, // Magenta
  { r: 16, g: 185, b: 129, a: 140 }, // Emerald
  { r: 245, g: 158, b: 11, a: 140 }, // Amber
  { r: 139, g: 92, b: 246, a: 140 }, // Violet
  { r: 234, g: 88, b: 12, a: 140 }, // Orange
  { r: 2, g: 132, b: 199, a: 140 }, // Sky
  { r: 225, g: 29, b: 72, a: 140 }, // Rose
];

const MASK_STROKE_COLORS = [
  '#2A47FF',
  '#D946EF',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EA580C',
  '#0284C7',
  '#E11D48',
];

/** Decoded mask images together with the results they were decoded from. */
interface DecodedMasks {
  source: InstanceSegmentationResult<'xyxy', string>[];
  images: (SkImage | null)[];
}

/**
 * Renders high-accuracy colorized instance segmentation pixel masks, bounding boxes, and tags.
 *
 * Decodes Alpha_8 instance mask buffers onto full-resolution Skia canvas layers with
 * vibrant categorical blend colors.
 *
 * @param props Instance results, photo dimensions, and active viewport transformation.
 * @returns Alpha-blended Skia mask layers and bounding boxes.
 */
export function InstanceSegmentationOverlay({
  instances,
  imageWidth,
  imageHeight,
  transform,
}: InstanceSegmentationOverlayProps) {
  // Decode masks for the current instances.
  const decoded = React.useMemo<DecodedMasks>(() => {
    const images = instances.map((inst) => {
      try {
        return inst.mask ? bufferToSkImage(inst.mask) : null;
      } catch (err) {
        console.warn('Failed to decode instance mask image:', err);
        return null;
      }
    });
    return { source: instances, images };
  }, [instances]);

  // Dispose superseded SkImages after React has committed the updated tree.
  const activeImagesRef = React.useRef(decoded.images);
  React.useEffect(() => {
    const prevImages = activeImagesRef.current;
    activeImagesRef.current = decoded.images;
    if (prevImages !== decoded.images) {
      prevImages.forEach((img) => img?.dispose());
    }
  }, [decoded.images]);

  // Clean up remaining images on unmount.
  React.useEffect(() => {
    return () => {
      activeImagesRef.current.forEach((img) => img?.dispose());
    };
  }, []);

  const { scale, offsetX, offsetY } = transform;
  const maskImages = decoded.images;

  if (instances.length === 0 || imageWidth === 0 || imageHeight === 0) return null;

  const targetWidth = imageWidth * scale;
  const targetHeight = imageHeight * scale;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Full-Image Skia Color-Tinted Instance Masks */}
      <Canvas style={StyleSheet.absoluteFill}>
        {maskImages?.map((maskImage, idx) => {
          if (!maskImage) return null;
          const color = MASK_COLORS[idx % MASK_COLORS.length]!;

          return (
            <SkiaImage
              key={`mask-${idx}`}
              image={maskImage}
              fit="fill"
              x={offsetX}
              y={offsetY}
              width={targetWidth}
              height={targetHeight}
            >
              <BlendColor
                color={`rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`}
                mode="srcIn"
              />
            </SkiaImage>
          );
        })}
      </Canvas>

      {/* Bounding Boxes & Confidence Tags */}
      {instances.map((instance, idx) => {
        const strokeColor = MASK_STROKE_COLORS[idx % MASK_STROKE_COLORS.length]!;
        const left = Math.round(offsetX + instance.box.xmin * scale);
        const top = Math.round(offsetY + instance.box.ymin * scale);
        const width = Math.round((instance.box.xmax - instance.box.xmin) * scale);
        const height = Math.round((instance.box.ymax - instance.box.ymin) * scale);
        const isNearTop = top < 24;

        return (
          <View
            key={`box-${idx}`}
            style={[
              styles.instanceBox,
              {
                left,
                top,
                width,
                height,
                borderColor: strokeColor,
              },
            ]}
          >
            <View
              style={[
                styles.instanceTag,
                {
                  backgroundColor: strokeColor,
                  top: isNearTop ? 2 : -22,
                  left: isNearTop ? 2 : -1,
                },
              ]}
            >
              <Text style={styles.instanceTagText}>
                {instance.label} {Math.round(instance.confidence * 100)}%
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  instanceBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: radius.xs,
  },
  instanceTag: {
    position: 'absolute',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  instanceTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
