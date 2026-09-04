import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { borderWidth, radius, spacing, overlay } from '@/theme';

export interface CandidateQueryItem {
  id: string;
  text: string;
  score: number | null;
}

const ROW_HEIGHT = 32;
const ROW_GAP = 4;
const ROW_PITCH = ROW_HEIGHT + ROW_GAP; // 36px per row

function CandidateQueryRow({
  item,
  initialIndex,
  targetIndex,
  maxScore,
  isRanked,
}: {
  item: CandidateQueryItem;
  initialIndex: number;
  targetIndex: number;
  maxScore: number;
  isRanked: boolean;
}) {
  const widthAnim = useSharedValue(0);
  const topAnim = useSharedValue(initialIndex * ROW_PITCH);

  const pct =
    item.score != null && maxScore > 0
      ? Math.max(Math.min((item.score / maxScore) * 100, 100), 4)
      : 0;

  useEffect(() => {
    if (!isRanked) {
      topAnim.value = initialIndex * ROW_PITCH;
      widthAnim.value = 0;
      return;
    }

    // Start at initial shuffled position, then smoothly animate to sorted rank position
    topAnim.value = initialIndex * ROW_PITCH;
    topAnim.value = withDelay(
      500,
      withSpring(targetIndex * ROW_PITCH, {
        damping: 18,
        stiffness: 120,
        mass: 0.9,
      })
    );

    // Reveal similarity score bar as rows settle
    widthAnim.value = withDelay(850, withTiming(pct, { duration: 450 }));
  }, [isRanked, initialIndex, targetIndex, pct, topAnim, widthAnim]);

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: topAnim.value }],
  }));

  const barAnimatedStyle = useAnimatedStyle(() => ({
    width: `${widthAnim.value}%`,
  }));

  const scoreAnimatedStyle = useAnimatedStyle(() => ({
    opacity: widthAnim.value > 0 ? 1 : 0,
  }));

  const isTop = targetIndex === 0 && isRanked;

  return (
    <Animated.View style={[styles.row, rowAnimatedStyle]}>
      {/* Background score track */}
      {isRanked ? (
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: isTop ? overlay.tintSoft : 'rgba(255, 255, 255, 0.06)',
            },
            barAnimatedStyle,
          ]}
        />
      ) : null}

      <View style={styles.rowContent}>
        <View style={styles.queryIconContainer}>
          <Icon name="search" size={12} color={overlay.textMuted} />
        </View>

        <Text style={[styles.labelText, isTop && styles.labelTextTop]} numberOfLines={1}>
          {item.text}
        </Text>

        {isRanked && item.score != null ? (
          <Animated.Text
            style={[styles.scoreText, isTop && styles.scoreTextTop, scoreAnimatedStyle]}
          >
            {item.score.toFixed(3)}
          </Animated.Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

export interface MultimodalRankOverlayProps {
  /** Candidate queries with optional similarity scores. */
  items: CandidateQueryItem[];
  /** Whether the user is actively pressing the compare button to view the photo. */
  showImage?: boolean;
  /** Callback triggered when user presses down on the hold button. */
  onPressInImage?: () => void;
  /** Callback triggered when user releases the hold button. */
  onPressOutImage?: () => void;
}

/**
 * Overlay for Multimodal Search (CLIP zero-shot ranking).
 *
 * Renders all 5 candidate descriptions in descending match rank after inference,
 * with a "Hold to view photo" pill button so the user can easily see the underlying image.
 *
 * @param props Candidate query items and hold-to-view-photo handlers.
 * @returns Self-contained, floating rank card.
 */
export function MultimodalRankOverlay({
  items,
  showImage = false,
  onPressInImage,
  onPressOutImage,
}: MultimodalRankOverlayProps) {
  const isRanked = items.some((i) => i.score != null);
  if (!isRanked) return null;

  const maxScore = Math.max(...items.map((i) => i.score ?? 0), 0.01);
  const totalContentHeight = items.length * ROW_PITCH - ROW_GAP;

  const sortedItems = [...items].sort((a, b) => {
    if (a.score != null && b.score != null) return b.score - a.score;
    if (a.score != null) return -1;
    if (b.score != null) return 1;
    return 0;
  });

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={[styles.card, showImage && { opacity: 0 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Semantic Match Ranking</Text>
        </View>

        <View style={[styles.list, { height: totalContentHeight }]}>
          {items.map((item, initialIndex) => {
            const targetIndex = sortedItems.findIndex((s) => s.id === item.id);
            return (
              <CandidateQueryRow
                key={item.id}
                item={item}
                initialIndex={initialIndex}
                targetIndex={targetIndex}
                maxScore={maxScore}
                isRanked={isRanked}
              />
            );
          })}
        </View>
      </View>

      {onPressInImage && onPressOutImage && (
        <Pressable onPressIn={onPressInImage} onPressOut={onPressOutImage} style={styles.holdPill}>
          <Text style={styles.holdText}>{showImage ? 'Viewing photo' : 'Hold to view photo'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: overlay.bg,
    borderRadius: radius.md,
    borderWidth,
    borderColor: overlay.border,
    padding: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  headerTitle: {
    color: overlay.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  list: {
    position: 'relative',
    width: '100%',
  },
  row: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    borderRadius: radius.xs,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.xs,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  queryIconContainer: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    width: 16,
  },
  rankTextTop: {
    color: overlay.tint,
  },
  labelText: {
    flex: 1,
    color: overlay.textSecondary,
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  labelTextTop: {
    color: overlay.textPrimary,
    fontWeight: '500',
  },
  scoreText: {
    color: overlay.textMuted,
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  scoreTextTop: {
    color: overlay.tint,
    fontWeight: '600',
  },
  holdPill: {
    alignSelf: 'center',
    backgroundColor: overlay.bg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth,
    borderColor: overlay.border,
  },
  holdText: {
    color: overlay.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
