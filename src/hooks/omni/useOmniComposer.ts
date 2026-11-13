import { useState } from 'react';
import { Keyboard } from 'react-native';

import type { PickedImage } from '@/components/PhotoPicker';
import type { useOmni } from '@/hooks/omni/useOmni';
import { usePhotoInput } from '@/hooks/usePhotoInput';

/** Owns the Omni draft, photo selection and modal; submits accepted inputs without voice attachments. */
export function useOmniComposer(omni: ReturnType<typeof useOmni>) {
  const [historyVisible, setHistoryVisible] = useState(false);
  const [draft, setDraft] = useState('');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photo = usePhotoInput(setImage, 800, setError);
  const ready = omni.model.loaded && omni.model.prepared && omni.status.isReady;
  const blocked = omni.busy || omni.model.deleting || omni.isRecording || omni.recordingStarting;
  const clearComposer = () => {
    setDraft('');
    photo.clear();
  };
  const send = async () => {
    if (!ready || blocked || photo.picking || (!draft.trim() && !image)) return;
    Keyboard.dismiss();
    setError(null);
    await omni.run(
      {
        prompt: draft.trim() || (image ? 'Describe this photo briefly.' : ''),
        imageUri: image?.uri,
        image: image?.buffer,
      },
      clearComposer
    );
  };
  const pressOrb = () => {
    // The hero fades while typing; tapping its area should dismiss the keyboard,
    // not activate the otherwise invisible voice button underneath it.
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
      return;
    }
    if (!ready || omni.recordingStarting || omni.model.deleting || photo.picking) return;
    if (omni.busy || omni.playing || omni.bufferingSpeech) omni.stop();
    else {
      Keyboard.dismiss();
      setError(null);
      void omni.record(
        { prompt: draft.trim(), image: image?.buffer, imageUri: image?.uri },
        clearComposer
      );
    }
  };
  return {
    historyVisible,
    setHistoryVisible,
    draft,
    setDraft,
    error,
    photo,
    ready,
    blocked,
    send,
    pressOrb,
  };
}
