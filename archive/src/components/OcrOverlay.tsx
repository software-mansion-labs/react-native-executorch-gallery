import React, { useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import type { OcrDetection } from 'react-native-executorch';
import type { ViewportTransform } from '@/components/PhotoPicker';
import { borderWidth, radius, spacing, overlay } from '@/theme';

export interface OcrOverlayProps {
  /** Array of recognized text detections and quadrilateral boundaries. */
  detections: OcrDetection[];
  /** Geometric viewport transformation mapping pixel coordinates to screen bounds. */
  transform: ViewportTransform;
}

/**
 * Ray-casting point-in-polygon algorithm to test whether a touch point (px, py)
 * falls inside an arbitrarily oriented quadrilateral.
 */
function isPointInQuad(
  px: number,
  py: number,
  quad: readonly { x: number; y: number }[],
  scale: number,
  offsetX: number,
  offsetY: number
): boolean {
  if (quad.length < 3) return false;
  let inside = false;
  for (let i = 0, j = quad.length - 1; i < quad.length; j = i++) {
    const xi = offsetX + quad[i]!.x * scale;
    const yi = offsetY + quad[i]!.y * scale;
    const xj = offsetX + quad[j]!.x * scale;
    const yj = offsetY + quad[j]!.y * scale;
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Interactive OCR overlay rendering quadrilateral bounds with exact polygonal hit testing.
 *
 * Supports rotated, slanted, and perspective-distorted text quadrilaterals with
 * pixel-accurate ray-casting selection and boundary-aware frosted tooltips.
 *
 * @param props OCR detections and active viewport transformation.
 * @returns Clean quadrilateral bounding boxes with interactive text tooltips.
 */
export function OcrOverlay({ detections, transform }: OcrOverlayProps) {
  const [prevDetections, setPrevDetections] = useState(detections);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  if (prevDetections !== detections) {
    setPrevDetections(detections);
    setSelectedIndex(null);
  }

  const { scale, offsetX, offsetY } = transform;

  // Build Skia quadrilateral polygon paths
  const quadPaths = React.useMemo(() => {
    return detections.map((det) => {
      const p = Skia.Path.Make();
      if (det.quad.length >= 4) {
        const p0 = det.quad[0]!;
        p.moveTo(offsetX + p0.x * scale, offsetY + p0.y * scale);
        for (let i = 1; i < det.quad.length; i++) {
          const pt = det.quad[i]!;
          p.lineTo(offsetX + pt.x * scale, offsetY + pt.y * scale);
        }
        p.close();
      }
      return p;
    });
  }, [detections, offsetX, offsetY, scale]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContainerSize({ width, height });
    }
  };

  const handlePress = (e: GestureResponderEvent) => {
    const { locationX: tx, locationY: ty } = e.nativeEvent;

    let hitIndex: number | null = null;
    let minDistance = Infinity;

    for (let i = 0; i < detections.length; i++) {
      const det = detections[i]!;
      if (isPointInQuad(tx, ty, det.quad, scale, offsetX, offsetY)) {
        const cx = offsetX + (det.quad.reduce((sum, p) => sum + p.x, 0) / det.quad.length) * scale;
        const cy = offsetY + (det.quad.reduce((sum, p) => sum + p.y, 0) / det.quad.length) * scale;
        const dist = Math.hypot(tx - cx, ty - cy);
        if (dist < minDistance) {
          minDistance = dist;
          hitIndex = i;
        }
      }
    }

    setSelectedIndex((prev) => (prev === hitIndex ? null : hitIndex));
  };

  // Compute boundary-clamped tooltip position
  const selectedQuadInfo = React.useMemo(() => {
    if (selectedIndex == null || !detections[selectedIndex]) return null;
    const det = detections[selectedIndex]!;
    const xs = det.quad.map((p) => offsetX + p.x * scale);
    const ys = det.quad.map((p) => offsetY + p.y * scale);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const centerX = (minX + maxX) / 2;

    const viewportW = containerSize.width || 360;
    const cardWidth = Math.min(260, viewportW - 32);
    const clampLeft = Math.max(16, Math.min(centerX - cardWidth / 2, viewportW - cardWidth - 16));

    const isNearTop = minY < 76;

    return {
      text: det.text,
      confidence: Math.round(det.confidence * 100),
      left: clampLeft,
      width: cardWidth,
      top: isNearTop ? maxY + 8 : undefined,
      bottom: isNearTop ? undefined : (containerSize.height || 400) - minY + 8,
    };
  }, [selectedIndex, detections, offsetX, offsetY, scale, containerSize]);

  // Placed after every hook: bailing out earlier changes the hook count between
  // renders and throws once detections arrive.
  if (detections.length === 0) return null;

  return (
    <Pressable onPress={handlePress} onLayout={handleLayout} style={StyleSheet.absoluteFill}>
      {/* Top Floating Instruction Pill */}
      <View style={styles.hintContainer} pointerEvents="none">
        <View style={styles.hintPill}>
          <Text style={styles.hintText}>Tap any box to reveal text</Text>
        </View>
      </View>

      {/* Skia Quadrilateral Polygon Fills & Strokes */}
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {quadPaths.map((p, idx) => {
          const isSelected = selectedIndex === idx;
          return (
            <React.Fragment key={`quad-draw-${idx}`}>
              <Path
                path={p}
                color={isSelected ? overlay.tintSoft : overlay.tintFaint}
                style="fill"
              />
              <Path
                path={p}
                color={overlay.tint}
                style="stroke"
                strokeWidth={isSelected ? 2 : 1.25}
                strokeCap="round"
                strokeJoin="round"
              />
            </React.Fragment>
          );
        })}
      </Canvas>

      {/* Boundary-Clamped Sophisticated Tooltip Card */}
      {selectedQuadInfo ? (
        <View
          pointerEvents="none"
          style={[
            styles.tooltipAnchor,
            {
              left: selectedQuadInfo.left,
              width: selectedQuadInfo.width,
              top: selectedQuadInfo.top,
              bottom: selectedQuadInfo.bottom,
            },
          ]}
        >
          <View style={styles.tooltipCard}>
            <View style={styles.tooltipHeader}>
              <Text style={styles.headerTitle}>Recognized text</Text>
              <Text style={styles.headerConf}>{selectedQuadInfo.confidence}%</Text>
            </View>
            <Text style={styles.tooltipBodyText}>{selectedQuadInfo.text}</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hintContainer: {
    position: 'absolute',
    top: spacing.sm,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  hintPill: {
    backgroundColor: overlay.bg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth,
    borderColor: overlay.border,
  },
  hintText: {
    color: overlay.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  tooltipAnchor: {
    position: 'absolute',
    zIndex: 999,
  },
  tooltipCard: {
    backgroundColor: overlay.bgStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth,
    borderColor: overlay.border,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  headerTitle: {
    color: overlay.textMuted,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerConf: {
    color: overlay.tint,
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  tooltipBodyText: {
    color: overlay.textPrimary,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
});
