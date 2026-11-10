import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useChatKeyboard } from '@/hooks/useChatKeyboard';
import { AppText } from '@/components/AppText';
import { ModelSetup } from '@/components/ModelSetup';
import type { PickedImage } from '@/components/PhotoPicker';
import { ChatImageInput } from '@/components/image-description/ChatImageInput';
import { ChatImagePreview } from '@/components/image-description/ChatImagePreview';
import { usePhotoInput } from '@/hooks/usePhotoInput';
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
  const { keyboardStyle } = useChatKeyboard();
  const [prompt, setPrompt] = useState('What can you do?');
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
      scrollable={false}
    >
      <Animated.View style={[styles.root, keyboardStyle]}>
        <ScrollView
          style={styles.root}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
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
          <OmniPhotoInput
            key={omni.model.revision}
            onPick={setImage}
            disabled={!ready || disabled}
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
          {omni.busy && <AppText tone="muted">Generating locally…</AppText>}
          {!!omni.result?.text && <AppText selectable>{omni.result.text}</AppText>}
          {!!omni.result?.audio.length &&
            button('Play generated speech', () => void omni.play(), disabled)}
          {omni.result?.limited && (
            <AppText tone="muted">Output reached the demo limit. Try a shorter question.</AppText>
          )}
        </ScrollView>
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
      </Animated.View>
    </TaskScreen>
  );
}
function OmniPhotoInput({
  onPick,
  disabled,
}: {
  onPick: (image: PickedImage | null) => void;
  disabled: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const photo = usePhotoInput(onPick, 800, setError);
  return (
    <View style={styles.row}>
      <ChatImageInput onChoose={photo.choose} picking={photo.picking} disabled={disabled} />
      {error && <AppText tone="muted">{error}</AppText>}
      {photo.image && (
        <ChatImagePreview
          image={photo.image}
          onRemove={photo.clear}
          disabled={disabled || photo.picking}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: tokens.spacing.lg, paddingBottom: tokens.spacing.lg },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  button: {
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.card,
    borderWidth: tokens.borderWidth.hairline,
  },
});
