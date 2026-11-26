import { PhotoActionButton } from '@/components/PhotoActionButton';

/** Adds an image from the photo library to the current chat draft. */
export function ChatImageInput({
  onChoose,
  disabled,
  picking,
}: {
  onChoose: () => Promise<void>;
  disabled: boolean;
  picking: boolean;
}) {
  return (
    <PhotoActionButton
      size="small"
      iconName="add"
      label="Add photo"
      disabled={disabled || picking}
      loading={picking}
      onPress={() => void onChoose()}
    />
  );
}
