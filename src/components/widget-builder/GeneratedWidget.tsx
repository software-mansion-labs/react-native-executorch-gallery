import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, useReducedMotion, ReduceMotion } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { IconButton } from '@/components/IconButton';
import { WidgetBuildLabel } from '@/components/widget-builder/WidgetBuildLabel';
import { WidgetControl } from '@/components/widget-builder/WidgetControl';
import { WidgetSkeleton } from '@/components/widget-builder/WidgetSkeleton';
import { useWidgetAppearance } from '@/hooks/widget-builder/useWidgetAppearance';
import { useWidgetValues } from '@/hooks/widget-builder/useWidgetValues';
import type { GeneratedApp } from '@/lib/widget-builder/app-builder';
import { widgetLayout } from '@/lib/widget-builder/widget-appearance';
import { widgetReveal, widgetExit, widgetExpansion } from '@/lib/widget-builder/widget-motion';
import { tokens } from '@/theme';

/** Shows a skeleton until the first generated element, then progressively reveals real content. */
export function GeneratedWidget({
  widget,
  building = false,
  appearanceReady = true,
}: {
  widget: GeneratedApp;
  building?: boolean;
  appearanceReady?: boolean;
}) {
  const look = useWidgetAppearance(appearanceReady ? widget.appearance : undefined);
  const { colors, appearance } = look;
  const reducedMotion = useReducedMotion();
  const { values, set, reset, resetVersion } = useWidgetValues(widget);
  const grid = widget.appearance.layout === 'grid';
  const empty = !widget.title && !widget.description && !widget.controls.length;
  return (
    <Animated.View
      entering={widgetReveal()}
      layout={widgetExpansion}
      style={[
        styles.card,
        look.card,
        building && styles.buildingCard,
        {
          transitionProperty: 'backgroundColor',
          transitionDuration: reducedMotion ? 0 : tokens.motion.themeTransitionDuration,
        },
      ]}
    >
      {look.gradient && (
        <Animated.View
          pointerEvents="none"
          entering={FadeIn.duration(tokens.motion.themeTransitionDuration).reduceMotion(
            ReduceMotion.System
          )}
          style={StyleSheet.absoluteFill}
        >
          <LinearGradient
            colors={look.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      {building && <WidgetBuildLabel appearance={appearance} palette={colors} />}
      {building && empty && (
        <Animated.View
          key="skeleton"
          entering={widgetReveal()}
          exiting={widgetExit}
          layout={widgetExpansion}
          style={styles.skeleton}
        >
          <View style={styles.skeletonCopy}>
            <WidgetSkeleton appearance={appearance} width="68%" />
            <WidgetSkeleton appearance={appearance} width="90%" />
          </View>
          <View style={styles.skeletonField}>
            <WidgetSkeleton appearance={appearance} width="42%" />
            <WidgetSkeleton appearance={appearance} variant="control" />
          </View>
        </Animated.View>
      )}
      {(!!widget.title || !!widget.description) && (
        <Animated.View layout={widgetExpansion} style={styles.copy}>
          {!!widget.title && (
            <Animated.View
              layout={widgetExpansion}
              style={[
                styles.titleRow,
                building && styles.buildingTitle,
                !building && widget.appearance.alignment === 'center' && styles.centeredTitle,
              ]}
            >
              <Animated.View key="title" entering={widgetReveal()} layout={widgetExpansion}>
                <AppText style={look.text.title}>{widget.title}</AppText>
              </Animated.View>
              {!building && (
                <View style={styles.reset}>
                  <IconButton
                    color={colors.muted}
                    appearance={appearance}
                    icon="refresh-outline"
                    accessibilityLabel="Reset widget"
                    onPress={reset}
                    tone="muted"
                  />
                </View>
              )}
            </Animated.View>
          )}
          {!!widget.description && (
            <Animated.View key="description" entering={widgetReveal()} layout={widgetExpansion}>
              <AppText style={[look.text.secondary, { textAlign: widget.appearance.alignment }]}>
                {widget.description}
              </AppText>
            </Animated.View>
          )}
        </Animated.View>
      )}
      {!!widget.controls.length && (
        <Animated.View
          layout={widgetExpansion}
          style={[styles.fields, grid && styles.grid, { gap: look.card.gap }]}
        >
          {widget.controls.map((control, index) => {
            const full =
              control.emphasis ||
              ['checklist', 'single-select', 'multi-select', 'rating', 'timer', 'text'].includes(
                control.type
              );
            return (
              <Animated.View
                key={index}
                entering={widgetReveal()}
                layout={widgetExpansion}
                style={grid && !full ? styles.column : styles.full}
              >
                <WidgetControl
                  control={control}
                  value={values[index]}
                  onChange={(value) => set(index, value)}
                  disabled={building}
                  settings={widget.appearance}
                  resetVersion={resetVersion}
                />
              </Animated.View>
            );
          })}
        </Animated.View>
      )}
    </Animated.View>
  );
}
const { spacing, layout } = tokens;
const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  buildingCard: { minHeight: layout.homeCardMinHeight },
  skeleton: { gap: spacing.xl },
  skeletonCopy: { gap: spacing.lg },
  skeletonField: { gap: spacing.sm },
  copy: { gap: spacing.xs },
  titleRow: {
    minHeight: layout.touchTarget,
    paddingRight: layout.touchTarget,
    justifyContent: 'center',
  },
  centeredTitle: { paddingLeft: layout.touchTarget },
  buildingTitle: { minHeight: tokens.typography.heading.lineHeight, paddingRight: 0 },
  reset: { position: 'absolute', right: 0, top: 0 },
  fields: { gap: spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  column: { flexBasis: widgetLayout.gridColumn, flexGrow: 1 },
  full: { width: '100%' },
});
