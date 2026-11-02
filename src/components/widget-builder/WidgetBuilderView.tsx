import { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';

import { WidgetGenerationSheet } from '@/components/widget-builder/WidgetGenerationSheet';
import { GeneratedWidget } from '@/components/widget-builder/GeneratedWidget';
import { IconButton } from '@/components/IconButton';
import { ModelSetup } from '@/components/ModelSetup';
import type { ModelStatus } from '@/components/ModelSheet';
import { PromptInput } from '@/components/PromptInput';
import { TaskHero } from '@/components/TaskHero';
import { TaskHeroStage } from '@/components/TaskHeroStage';
import { useChatKeyboard } from '@/hooks/useChatKeyboard';
import { useKeyboardScroll } from '@/hooks/useKeyboardScroll';
import { useWidgetFullscreen } from '@/hooks/widget-builder/useWidgetFullscreen';
import type { ModelControls } from '@/hooks/useModelControls';
import type { GeneratedApp, WidgetPreview } from '@/lib/widget-builder/app-builder';
import { tokens } from '@/theme';

const suggestions = [
  {
    label: 'Coffee',
    prompt:
      'Build a coffee order widget with choose-one size and milk selectors, optional syrup add-ons, and an espresso shot counter. Use a stacked layout and a dark brown background with amber accents.',
  },
  {
    label: 'Party',
    prompt:
      'Build a disco party planner with a prep checklist, guest count input, and a music toggle. Use a stacked layout and a dark violet background with pink, blue, and yellow accents.',
  },
  {
    label: 'Focus',
    prompt:
      'Build a focus companion with a 25-minute work timer, a 5-minute break timer, and a daily goal of four focus sessions. Use a dark blue background with cyan accents.',
  },
];

/** Shows a generated native widget with its inspectable JSON and a keyboard-following prompt. */
export function WidgetBuilderView({
  input,
  onInputChange,
  widget,
  source,
  readOutput,
  buildingWidget,
  busy,
  canRun,
  canRegenerate,
  onRun,
  onRegenerate,
  onStop,
  model,
  status,
}: {
  input: string;
  onInputChange: (value: string) => void;
  widget: GeneratedApp | null;
  source: string;
  readOutput: () => string;
  buildingWidget: WidgetPreview;
  busy: boolean;
  canRun: boolean;
  canRegenerate: boolean;
  onRun: () => Promise<void>;
  onRegenerate: () => Promise<void>;
  onStop: () => void;
  model: ModelControls;
  status: ModelStatus;
}) {
  const [showSource, setShowSource] = useState(false);
  const { expanded, changing, toggleExpanded, minimize, previewStyle } = useWidgetFullscreen();
  const regenerate = async () => {
    if (!canRegenerate || changing) return;
    if (await minimize()) await onRegenerate();
  };
  const scroll = useKeyboardScroll();
  const { keyboardStyle, heroStyle } = useChatKeyboard();
  const ready = model.prepared && model.loaded && status.isReady && !model.deleting;
  return (
    <Animated.View style={[styles.root, keyboardStyle]}>
      <View style={styles.content}>
        {(widget || busy) && (
          <View style={styles.previewActions}>
            <IconButton
              icon="code-slash-outline"
              accessibilityLabel="View raw model output"
              onPress={() => setShowSource(true)}
              tone="muted"
            />
            <IconButton
              icon="repeat-outline"
              accessibilityLabel="Regenerate widget"
              disabled={!canRegenerate || changing}
              onPress={() => void regenerate()}
              tone="muted"
            />
            <IconButton
              icon={expanded ? 'close' : 'expand-outline'}
              accessibilityLabel={expanded ? 'Exit full screen widget' : 'Full screen widget'}
              disabled={changing || (busy && !expanded)}
              onPress={() => void toggleExpanded()}
              tone="muted"
            />
          </View>
        )}
        <Animated.ScrollView
          ref={scroll}
          style={styles.stage}
          contentContainerStyle={[styles.results, expanded && styles.expandedResults]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {(widget || busy) && (
            <>
              <Animated.View style={[styles.preview, previewStyle]}>
                <GeneratedWidget
                  key={busy ? 'building' : source}
                  widget={busy ? buildingWidget : widget!}
                  building={busy}
                  appearanceReady={!busy || buildingWidget.appearanceReady}
                />
              </Animated.View>
            </>
          )}
        </Animated.ScrollView>
        {ready && !expanded && (
          <Animated.View entering={entrance} exiting={exit}>
            <PromptInput
              value={input}
              onChangeText={onInputChange}
              onSubmit={() => {
                Keyboard.dismiss();
                void onRun();
              }}
              onStop={onStop}
              isGenerating={busy}
              canSubmit={canRun && !!input.trim()}
              placeholder={widget ? 'Build something else…' : 'Describe a small widget…'}
              submitLabel="Build widget"
              suggestions={suggestions}
            />
          </Animated.View>
        )}
        {!widget && !busy && (
          <TaskHeroStage pointerEvents={ready ? 'none' : 'box-none'} style={heroStyle}>
            <TaskHero
              title="An idea you can tap"
              description="Describe a tiny widget. Watch it become something you can actually use."
              setup={<ModelSetup model={model} status={status} />}
            />
          </TaskHeroStage>
        )}
        <WidgetGenerationSheet
          visible={showSource}
          busy={busy}
          readOutput={readOutput}
          onClose={() => setShowSource(false)}
        />
      </View>
    </Animated.View>
  );
}
const { spacing } = tokens;
const entrance = FadeIn.duration(tokens.motion.photoRevealDuration).reduceMotion(
  ReduceMotion.System
);
const exit = FadeOut.duration(tokens.motion.chatDisclosureFadeDuration).reduceMotion(
  ReduceMotion.System
);
const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { flex: 1, gap: spacing.sm },
  stage: { flex: 1, minHeight: 0 },
  results: { flexGrow: 1, paddingBottom: spacing.sm },
  expandedResults: { paddingBottom: spacing.xxxl },
  preview: { marginHorizontal: spacing.sm, transformOrigin: 'top center' },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: tokens.layout.touchTarget,
  },
});
