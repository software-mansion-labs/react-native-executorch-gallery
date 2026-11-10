import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { ModelSetup } from '@/components/ModelSetup';
import { PhotoPicker, type PickedImage } from '@/components/PhotoPicker';
import { PromptInput } from '@/components/PromptInput';
import { TaskScreen } from '@/components/TaskScreen';
import { useOmni, type OmniBackend } from '@/hooks/useOmni';
import { useTaskState } from '@/hooks/useTaskState';
import type { OmniMode } from '@/lib/omni/inference';
import { tokens, useTheme } from '@/theme';

export function OmniDemo({
  backend,
  setBackend,
}: {
  backend: OmniBackend;
  setBackend: (value: OmniBackend) => void;
}) {
  const { colors } = useTheme();
  const omni = useOmni(backend);
  const [prompt, setPrompt] = useState('Describe what you see in one sentence.');
  const [mode, setMode] = useState<OmniMode>('text');
  const [image, setImage] = useTaskState<PickedImage | null>(null, omni.model.revision);
  const disabled = omni.busy || omni.model.deleting || omni.isRecording || omni.recordingStarting;
  const ready = omni.model.loaded && omni.model.prepared && omni.status.isReady;
  const button = (label: string, onPress: () => void, blocked = false, selected = false) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, selected }}
      disabled={blocked}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: colors.surface, borderColor: selected ? colors.accent : colors.border },
      ]}
    >
      <AppText tone={selected ? 'accent' : 'muted'}>{label}</AppText>
    </Pressable>
  );
  return (
    <TaskScreen
      title="Omni conversation"
      model={omni.model}
      status={omni.status}
      error={omni.error}
      busy={disabled}
    >
      <View style={styles.content}>
        <AppText tone="muted">
          One model for text, photos and speech. Each request starts a fresh conversation.
        </AppText>
        <View style={styles.row}>
          {(['xnnpack', 'mlx-int4', 'mlx-int8'] as const).map((value) =>
            button(
              value === 'xnnpack' ? 'CPU' : value === 'mlx-int4' ? 'MLX 4-bit' : 'MLX 8-bit',
              () => setBackend(value),
              disabled || omni.model.loaded,
              backend === value
            )
          )}
        </View>
        <ModelSetup model={omni.model} status={omni.status} disabled={disabled} />
        <View style={styles.row}>
          {(['text', 'audio', 'interleaved'] as const).map((value) =>
            button(
              value === 'text' ? 'Text' : value === 'audio' ? 'Read aloud' : 'Text + speech',
              () => setMode(value),
              disabled,
              mode === value
            )
          )}
        </View>
        <PhotoPicker
          onPick={setImage}
          canPick={ready && !disabled}
          busy={disabled}
          placeholderTitle="Add a photo (optional)"
          placeholderDescription="Ask about a photo, record a question, or just type."
        />
        <View style={styles.row}>
          {button(
            omni.isRecording ? 'Stop recording' : 'Record audio',
            () => void omni.record(),
            !ready || omni.busy || omni.recordingStarting || omni.model.deleting
          )}
          {!!omni.audioSeconds &&
            button(`Clear ${omni.audioSeconds.toFixed(1)}s audio`, omni.clearAudio, disabled)}
        </View>
        <PromptInput
          value={prompt}
          onChangeText={setPrompt}
          onSubmit={() => void omni.run({ prompt, mode, image: image?.buffer })}
          onStop={omni.stop}
          isGenerating={omni.busy}
          disabled={!ready || omni.isRecording || omni.model.deleting}
          canSubmit={ready && !disabled && (!!prompt.trim() || !!image || !!omni.audioSeconds)}
          placeholder={mode === 'audio' ? 'Text to read aloud…' : 'Ask a question…'}
        />
        {omni.busy && <AppText tone="muted">Generating locally…</AppText>}
        {!!omni.result?.text && <AppText selectable>{omni.result.text}</AppText>}
        {!!omni.result?.audio.length &&
          button('Play generated speech', () => void omni.play(), disabled)}
        {omni.result?.limited && (
          <AppText tone="muted">Output reached the demo limit. Try a shorter question.</AppText>
        )}
      </View>
    </TaskScreen>
  );
}
const styles = StyleSheet.create({
  content: { gap: tokens.spacing.lg },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  button: {
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.card,
    borderWidth: tokens.borderWidth.hairline,
  },
});
