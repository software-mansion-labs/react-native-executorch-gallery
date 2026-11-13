import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BottomSheet } from '@/components/BottomSheet';
import { IconToggle } from '@/components/IconToggle';
import { ModelSetup } from '@/components/ModelSetup';
import { PhotoActionButton } from '@/components/PhotoActionButton';
import { PhotoPicker } from '@/components/PhotoPicker';
import type { ModelControls } from '@/hooks/useModelControls';
import type { useScreenshotScrubber } from '@/hooks/screenshot-scrubber/useScreenshotScrubber';
import { regionRect } from '@/lib/screenshot-scrubber/regions';
import { tokens, useTheme } from '@/theme';

type Props = { model: ModelControls; scrubber: ReturnType<typeof useScreenshotScrubber> };

/** Shows source-resolution masks, an explicit original comparison, region review and PNG sharing. */
export function ScrubberView({ model, scrubber }: Props) {
  const { colors, iconSize } = useTheme();
  const [comparison, setComparison] = useState({ result: scrubber.result, original: false });
  const [reviewing, setReviewing] = useState(false);
  const original = comparison.result === scrubber.result && comparison.original;
  const { image, result, busy, status, phase, exported } = scrubber;
  const ready = model.prepared && model.loaded && status.isReady && !model.deleting;
  const hidden = result?.regions.filter((region) => region.hidden) ?? [];
  return (
    <>
      <PhotoPicker
        placeholderTitle="Keep the details private"
        placeholderDescription="Find private text, review the masks, then share a redacted copy."
        targetWidth={null}
        canPick={ready}
        busy={busy || model.deleting}
        setupAction={<ModelSetup model={model} status={status} disabled={busy} />}
        onPick={scrubber.pick}
        onRun={scrubber.run}
        canRun={ready && !!image}
        running={busy}
        renderOverlay={(transform) =>
          !original &&
          image && (
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              {hidden.map((region) => {
                const rect = regionRect(region, image.width, image.height);
                return (
                  <View
                    key={region.id}
                    style={{
                      position: 'absolute',
                      left: transform.offsetX + rect.x * transform.scale,
                      top: transform.offsetY + rect.y * transform.scale,
                      width: rect.width * transform.scale,
                      height: rect.height * transform.scale,
                      backgroundColor: colors.redaction,
                    }}
                  />
                );
              })}
            </View>
          )
        }
        resultsContent={
          <View style={styles.results}>
            <View style={styles.summary} accessibilityLiveRegion="polite">
              <AppText variant="secondary" tone="accent">
                {phase ??
                  (result
                    ? `${hidden.length} text regions hidden`
                    : image
                      ? 'Ready to find private text'
                      : ready
                        ? 'Choose a screenshot to begin'
                        : ' ')}
              </AppText>
              {result && (
                <AppText variant="caption" tone="muted">
                  {(result.latency / 1000).toFixed(1)} s
                </AppText>
              )}
            </View>
            {result && (
              <>
                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={original ? 'Show redacted' : 'Show original'}
                    accessibilityState={{ selected: original, disabled: busy }}
                    disabled={busy}
                    onPress={() => setComparison({ result, original: !original })}
                    style={[styles.textButton, { backgroundColor: colors.surface }]}
                  >
                    <AppText variant="secondary" tone={original ? 'accent' : 'text'}>
                      Show
                    </AppText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    accessibilityLabel="Review regions"
                    onPress={() => setReviewing(true)}
                    style={[styles.textButton, { backgroundColor: colors.surface }]}
                  >
                    <AppText variant="secondary">Review</AppText>
                  </Pressable>
                  {Platform.OS === 'ios' && (
                    <PhotoActionButton
                      iconName="share-outline"
                      label="Share redacted PNG"
                      size="small"
                      disabled={busy || !hidden.length}
                      onPress={() => void scrubber.share(colors.redaction)}
                    />
                  )}
                </View>
                {!result.regions.length && (
                  <AppText variant="caption" tone="muted">
                    No text was recognized.
                  </AppText>
                )}
                {exported && (
                  <AppText variant="caption" tone="accent">
                    Redacted PNG created
                  </AppText>
                )}
              </>
            )}
          </View>
        }
      />
      <BottomSheet
        title="Review regions"
        visible={reviewing && !!result}
        onClose={() => setReviewing(false)}
      >
        <AppText variant="secondary" tone="muted" style={styles.reviewHint}>
          Turn on a mask to hide the entire text region. You can also hide details the model missed.
        </AppText>
        {result?.regions.map((region) => (
          <View key={region.id} style={[styles.region, { borderBottomColor: colors.border }]}>
            <View style={styles.regionText}>
              <AppText variant="secondary">{region.text}</AppText>
              <AppText variant="caption" tone="muted">
                {region.labels.length
                  ? region.labels
                      .map((label) => label.replace(/^private_/, '').replaceAll('_', ' '))
                      .join(' · ')
                  : 'Review manually'}
              </AppText>
            </View>
            <IconToggle
              label={`Hide region ${region.id + 1}: ${region.text}`}
              value={region.hidden}
              onChange={() => scrubber.toggle(region.id)}
              disabled={busy}
              renderIcon={(hidden, color) => (
                <Ionicons
                  name={hidden ? 'eye-off-outline' : 'eye-outline'}
                  size={iconSize.small}
                  color={color}
                  accessible={false}
                />
              )}
            />
          </View>
        ))}
      </BottomSheet>
    </>
  );
}

const { spacing, radius, borderWidth, layout } = tokens;
const styles = StyleSheet.create({
  results: { gap: spacing.sm },
  summary: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  textButton: {
    flex: 1,
    minHeight: layout.touchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  reviewHint: { marginBottom: spacing.md },
  region: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: borderWidth.hairline,
  },
  regionText: { flex: 1, gap: spacing.xs },
});
